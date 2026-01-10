import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { cn, formatDateLong } from "../lib/utils";
import { loadEntries, loadReflections, saveEntries, saveReflections } from "../lib/storage";
import type { JournalEntry, Reflection } from "../types/journal";
import { loadMemory, saveMemory, extractMemoryFromText, buildMemoryFromEntries } from "../lib/memory";
import type { UserMemory } from "../types/memory";
import { quoteOfTheDay } from "../lib/quote";
import {
  generateLocalReflection,
  generateEnhancedReflection,
} from "../lib/reflection";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const STARTER_CHIPS = [
  "I don’t know where to start. I just feel…",
  "Today felt heavy because…",
  "I keep thinking about…",
  "Something that’s bothering me is…",
  "If I’m honest, I’ve been avoiding…",
];

export function JournalPage({ privacyMode }: { privacyMode: boolean }) {
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

  const [text, setText] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const [reflecting, setReflecting] = useState(false);
  const [reflectError, setReflectError] = useState<string | null>(null);

  const todayLabel = useMemo(() => formatDateLong(new Date()), []);
  const selectedReflection = useMemo(() => {
    if (!selectedEntryId) return null;
    return reflections.find((r) => r.entryId === selectedEntryId) ?? null;
  }, [reflections, selectedEntryId]);

  function onUseChip(chip: string) {
    setText((prev) => (prev.trim().length ? prev : chip));
  }

  function onSave() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const entry: JournalEntry = {
      id: uid(),
      createdAt: new Date().toISOString(),
      text: trimmed,
    };

    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(next);

    const nextMem = extractMemoryFromText(trimmed, memory);
    setMemory(nextMem);
    saveMemory(nextMem);

    setSelectedEntryId(entry.id);
    setText("");
  }

  async function onReflect() {
    setReflectError(null);
    setReflecting(true);

    try {
      // Reflect on selected entry, else most recent, else current draft text
      const entry =
        (selectedEntryId ? entries.find((e) => e.id === selectedEntryId) : null) ?? entries[0];

      const sourceText = entry?.text ?? text.trim();
      if (!sourceText) {
        setReflecting(false);
        return;
      }

      const out = privacyMode
        ? generateLocalReflection(sourceText, memory)
        : await generateEnhancedReflection(sourceText, memory);

      const reflection: Reflection = {
        entryId: entry?.id ?? "draft",
        createdAt: new Date().toISOString(),
        mirror: out.mirror,
        question: out.question,
        nudges: out.nudges,
      };

      if (entry?.id) {
        const next = [
          ...reflections.filter((r) => r.entryId !== entry.id),
          reflection,
        ];
        setReflections(next);
        saveReflections(next);
        setSelectedEntryId(entry.id);
      } else {
        setSelectedEntryId("draft");
        setReflections((prev) => [...prev.filter((r) => r.entryId !== "draft"), reflection]);
      }
    } catch (e: any) {
      setReflectError(
        "Enhanced reflection couldn’t load right now. Try again, or switch back to Privacy Mode."
      );
    } finally {
      setReflecting(false);
    }
  }

  const modeLabel = privacyMode ? "Private (local)" : "Enhanced (LLM)";
  const modeHint = privacyMode
    ? "No network calls. Runs entirely in your browser."
    : "Uses an API key. In production, this should run through a server.";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Journal</h1>
        <p className="text-slate-600">
          {todayLabel} · Write messy. Start anywhere. I’ll listen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Today’s line</div>
          <div className="mt-1 text-sm text-slate-800">{quoteOfTheDay()}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Reflection mode</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{modeLabel}</div>
          <div className="mt-1 text-xs text-slate-600">{modeHint}</div>
          {!privacyMode && !import.meta.env.VITE_OPENAI_API_KEY && (
            <div className="mt-2 text-xs text-rose-700">
              Missing <span className="font-mono">VITE_OPENAI_API_KEY</span> — enhanced mode will fall back to local.
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
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
              onClick={onSave}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Save
            </button>

            <button
              type="button"
              onClick={onReflect}
              disabled={reflecting}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50",
                reflecting && "opacity-60 cursor-not-allowed"
              )}
            >
              {reflecting ? "Reflecting…" : "Reflect"}
            </button>

            <span className="ml-auto text-xs text-slate-500">
              Tip: save first if you want reflections tied to an entry.
            </span>
          </div>

          {reflectError && (
            <div className="mt-3 text-sm text-rose-700">
              {reflectError}
            </div>
          )}
        </div>
      </Card>

      {selectedReflection && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Listener reflection</div>
            <div className="text-xs text-slate-500">{modeLabel}</div>
          </div>

          <p className="mt-2 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
            {selectedReflection.mirror}
          </p>

          <div className="mt-4 text-sm font-semibold text-slate-900">A gentle question</div>
          <p className="mt-1 text-sm text-slate-700 leading-relaxed">
            {selectedReflection.question}
          </p>

          <div className="mt-4 text-sm font-semibold text-slate-900">If it helps…</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
            {selectedReflection.nudges.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Recent entries</div>
            <div className="text-xs text-slate-600">Click one to view its reflection.</div>
          </div>
          <div className="text-xs text-slate-500">{entries.length} saved</div>
        </div>

        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-sm text-slate-600">
              No entries yet. Try a starter prompt above.
            </div>
          ) : (
            entries.slice(0, 6).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedEntryId(e.id)}
                className={cn(
                  "w-full text-left rounded-2xl border px-3 py-3 transition",
                  selectedEntryId === e.id
                    ? "border-slate-900 bg-white"
                    : "border-slate-200 bg-white/70 hover:bg-white"
                )}
              >
                <div className="text-xs text-slate-500">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-slate-800 line-clamp-2">
                  {e.text}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
