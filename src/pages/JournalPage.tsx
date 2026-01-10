import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { cn, formatDateLong } from "../lib/utils";
import { loadEntries, loadReflections, saveEntries, saveReflections } from "../lib/storage";
import type { JournalEntry, Reflection } from "../types/journal";
import { loadMemory, saveMemory, extractMemoryFromText, buildMemoryFromEntries } from "../lib/memory";
import type { UserMemory } from "../types/memory";
import { quoteOfTheDay } from "../lib/quote";
import { generateLocalReflection, generateEnhancedReflection } from "../lib/reflection";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Trash2, PencilLine, Plus } from "lucide-react";
import { TutorialModal } from "../components/TutorialModal";


function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const STARTER_CHIPS = [
  "Quick recap: today I…",
  "One thing that went well was…",
  "Something I’m looking forward to is…",
  "Something that annoyed me was…",
  "A small win I want to remember is…",
  "Right now I feel…",
];

export function JournalPage({ privacyMode }: { privacyMode: boolean }) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const tutorial = [
    {
      title: "A gentle place to think out loud",
      body:
        "This is journaling without pressure.\nWrite messy. Typos are fine. One sentence counts.",
    },
    {
      title: "Save vs Reflect (what’s the difference?)",
      body:
        "• Save / Update stores your entry.\n• Reflect draft gives instant feedback without saving.\n• Save & Reflect (or Update & Reflect) saves and generates a reflection.",
    },
    {
      title: "Privacy Mode",
      body:
        "Privacy Mode ON = local reflection in your browser.\nPrivacy Mode OFF = enhanced reflection using an LLM.\n(You’ll always get a reflection — it’ll just change how it’s generated.)",
    },
    {
      title: "Make it yours over time",
      body:
        "Solace remembers gentle preferences (like coping tools that help you).\nIt should feel subtle — not intrusive.",
    },
  ];

  const [entries, setEntries] = useState<JournalEntry[]>(() => loadEntries());
  const [reflections, setReflections] = useState<Reflection[]>(() => loadReflections());

  const [memory, setMemory] = useState<UserMemory>(() => {
    const m = loadMemory();
    if (!m.coping.length && !m.likes.length && !m.stressors.length && !m.wins.length && entries.length) {
      const built = buildMemoryFromEntries(entries);
      saveMemory(built);
      return built;
    }
    return m;
  });

  // editor state
  const [text, setText] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null); // null = new entry
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const [reflecting, setReflecting] = useState(false);
  const [reflectError, setReflectError] = useState<string | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const todayLabel = useMemo(() => formatDateLong(new Date()), []);
  const hasDraft = text.trim().length > 0;

  const selectedReflection = useMemo(() => {
    if (!selectedEntryId) return null;
    return reflections.find((r) => r.entryId === selectedEntryId) ?? null;
  }, [reflections, selectedEntryId]);

  function persistAll(nextEntries: JournalEntry[], nextReflections: Reflection[]) {
    setEntries(nextEntries);
    saveEntries(nextEntries);

    setReflections(nextReflections);
    saveReflections(nextReflections);

    const rebuilt = buildMemoryFromEntries(nextEntries);
    setMemory(rebuilt);
    saveMemory(rebuilt);
  }

  function onUseChip(chip: string) {
    setText((prev) => (prev.trim().length ? prev : chip));
  }

  function startNewEntry() {
    setEditingEntryId(null);
    setSelectedEntryId(null);
    setText("");
    setReflectError(null);
  }

  function beginEdit(entryId: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    setEditingEntryId(entry.id);
    setSelectedEntryId(entry.id);
    setText(entry.text);
    setReflectError(null);
  }

  function saveNewEntry(): JournalEntry | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const entry: JournalEntry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      text: trimmed,
    };

    const nextEntries = [entry, ...entries];
    setEntries(nextEntries);
    saveEntries(nextEntries);

    const nextMem = extractMemoryFromText(trimmed, memory);
    setMemory(nextMem);
    saveMemory(nextMem);

    setSelectedEntryId(entry.id);
    setEditingEntryId(entry.id);
    setText(trimmed); // keep it in editor so they can keep editing if they want
    return entry;
  }

  function updateExistingEntry(entryId: string): JournalEntry | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return null;

    const updated: JournalEntry = {
      ...entries[idx],
      text: trimmed,
    };

    const nextEntries = [...entries];
    nextEntries[idx] = updated;

    // Remove reflection for this entry (stale) until re-run
    const nextReflections = reflections.filter((r) => r.entryId !== entryId);

    persistAll(nextEntries, nextReflections);

    setSelectedEntryId(entryId);
    setEditingEntryId(entryId);
    return updated;
  }

  async function reflectOnText(entryId: string, entryText: string) {
    const out = privacyMode
      ? generateLocalReflection(entryText, memory)
      : await generateEnhancedReflection(entryText, memory);

    const reflection: Reflection = {
      entryId,
      createdAt: new Date().toISOString(),
      mirror: out.mirror,
      // question/nudges are now optional — store empty string/[] when absent to keep types stable
      question: out.question ?? "",
      nudges: out.nudges ?? [],
    };

    const nextReflections = [...reflections.filter((r) => r.entryId !== entryId), reflection];
    setReflections(nextReflections);
    saveReflections(nextReflections);
    setSelectedEntryId(entryId);
  }

  async function onSaveOnly() {
    setReflectError(null);
    if (!hasDraft) return;

    if (!editingEntryId) {
      saveNewEntry();
      return;
    }
    updateExistingEntry(editingEntryId);
  }

  async function onSaveAndReflect() {
    setReflectError(null);
    if (!hasDraft) return;

    setReflecting(true);
    try {
      let entry: JournalEntry | null = null;

      if (!editingEntryId) entry = saveNewEntry();
      else entry = updateExistingEntry(editingEntryId);

      if (!entry) return;

      await reflectOnText(entry.id, entry.text);
    } catch {
      setReflectError("Enhanced reflection couldn’t load. Try again or switch Privacy Mode back on.");
    } finally {
      setReflecting(false);
    }
  }

  async function onReflectDraftOnly() {
    setReflectError(null);
    if (!hasDraft) return;

    setReflecting(true);
    try {
      const draftId = "draft";
      const out = privacyMode
        ? generateLocalReflection(text.trim(), memory)
        : await generateEnhancedReflection(text.trim(), memory);

      const reflection: Reflection = {
        entryId: draftId,
        createdAt: new Date().toISOString(),
        mirror: out.mirror,
        question: out.question ?? "",
        nudges: out.nudges ?? [],
      };

      setReflections((prev) => [...prev.filter((r) => r.entryId !== draftId), reflection]);
      setSelectedEntryId(draftId);
    } catch {
      setReflectError("Enhanced reflection couldn’t load. Try again or switch Privacy Mode back on.");
    } finally {
      setReflecting(false);
    }
  }

  function onRequestDelete(entryId: string) {
    setDeleteTargetId(entryId);
  }

  function onConfirmDelete() {
    if (!deleteTargetId) return;

    const nextEntries = entries.filter((e) => e.id !== deleteTargetId);
    const nextReflections = reflections.filter(
      (r) => r.entryId !== deleteTargetId && r.entryId !== "draft"
    );

    persistAll(nextEntries, nextReflections);

    if (selectedEntryId === deleteTargetId) setSelectedEntryId(null);
    if (editingEntryId === deleteTargetId) startNewEntry();

    setDeleteTargetId(null);
  }

  const modeLabel = privacyMode ? "Private (local)" : "Enhanced (LLM)";

  const headerLine = "A gentle place to think out loud.";
  const subLine = "Start messy — I’ll help you untangle it.";

  const editorModeLabel = editingEntryId ? "Editing entry" : "New entry";
  const reflectHint = editingEntryId
    ? "Update & Reflect will refresh the reflection for this day."
    : "Save & Reflect creates an entry and generates a reflection.";

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete this entry?"
        description="This will permanently remove the entry and its reflection from this device."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={onConfirmDelete}
      />

    <TutorialModal
      open={showTutorial}
      step={tutorialStep}
      total={tutorial.length}
      title={tutorial[tutorialStep].title}
      body={tutorial[tutorialStep].body}
      onPrev={() => setTutorialStep((s) => Math.max(0, s - 1))}
      onNext={() => {
        if (tutorialStep === tutorial.length - 1) setShowTutorial(false);
        else setTutorialStep((s) => Math.min(tutorial.length - 1, s + 1));
      }}
      onClose={() => setShowTutorial(false)}
    />


    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Journal</h1>
        <p className="text-slate-600">{todayLabel} · A gentle place to think out loud.</p>
        <p className="text-xs text-slate-500 mt-1">Start messy — I’ll help you untangle it.</p>
      </div>

      <button
        type="button"
        onClick={() => { setTutorialStep(0); setShowTutorial(true); }}
        className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        Tutorial
      </button>
    </div>


      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Today’s line</div>
          <div className="mt-1 text-sm text-slate-800">{quoteOfTheDay()}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Reflection mode</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{modeLabel}</div>
          <div className="mt-1 text-xs text-slate-600">
            {privacyMode
              ? "Runs locally in your browser. No network calls."
              : "Uses an external LLM to generate reflections (prototype)."}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{editorModeLabel}</div>
            <div className="text-xs text-slate-600">{reflectHint}</div>
          </div>

          <button
            type="button"
            onClick={startNewEntry}
            className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2"
            title="Start a new entry"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STARTER_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUseChip(c)}
              className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type whatever’s on your mind… fragments are okay."
            className={cn(
              "min-h-[170px] w-full resize-none rounded-2xl border border-slate-200 bg-white/80 p-4",
              "text-slate-900 placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            )}
          />

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={onSaveAndReflect}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              disabled={!hasDraft || reflecting}
            >
              {reflecting ? "Working…" : editingEntryId ? "Update & Reflect" : "Save & Reflect"}
            </button>

            <button
              type="button"
              onClick={onSaveOnly}
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              disabled={!hasDraft || reflecting}
            >
              {editingEntryId ? "Update" : "Save"}
            </button>

            <button
              type="button"
              onClick={onReflectDraftOnly}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50",
                reflecting && "opacity-60 cursor-not-allowed"
              )}
              disabled={!hasDraft || reflecting}
              title="Reflect without saving"
            >
              {reflecting ? "Reflecting…" : "Reflect draft"}
            </button>

            <span className="ml-auto text-xs text-slate-500">
              Reflect draft doesn’t save anything.
            </span>
          </div>

          {reflectError && (
            <div className="mt-3 text-sm text-rose-700">{reflectError}</div>
          )}
        </div>
      </Card>

      {selectedReflection && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              Reflection {selectedEntryId === "draft" ? "(draft)" : ""}
            </div>
            <div className="text-xs text-slate-500">{modeLabel}</div>
          </div>

          <p className="mt-2 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
            {selectedReflection.mirror}
          </p>

          {selectedReflection.question?.trim() ? (
            <>
              <div className="mt-4 text-sm font-semibold text-slate-900">If you want to keep going</div>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                {selectedReflection.question}
              </p>
            </>
          ) : null}

          {selectedReflection.nudges?.length ? (
            <>
              <div className="mt-4 text-sm font-semibold text-slate-900">You could also…</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                {selectedReflection.nudges.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Recent entries</div>
            <div className="text-xs text-slate-600">
              Edit anytime. Update & Reflect refreshes the reflection.
            </div>
          </div>
          <div className="text-xs text-slate-500">{entries.length} saved</div>
        </div>

        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-sm text-slate-600">No entries yet.</div>
          ) : (
            entries.slice(0, 8).map((e) => (
              <div
                key={e.id}
                className={cn(
                  "w-full rounded-2xl border px-3 py-3 transition flex items-start justify-between gap-3",
                  selectedEntryId === e.id
                    ? "border-slate-900 bg-white"
                    : "border-slate-200 bg-white/70 hover:bg-white"
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedEntryId(e.id)}
                  className="flex-1 text-left"
                >
                  <div className="text-xs text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-sm text-slate-800 line-clamp-2">
                    {e.text}
                  </div>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(e.id)}
                    className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-700 hover:bg-slate-50"
                    title="Edit entry"
                  >
                    <PencilLine size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestDelete(e.id)}
                    className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-700 hover:bg-slate-50"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
