import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { cn, formatDateLong, randomId } from "../lib/utils";
import { SESSION_MODES, type SessionMode, type SessionModeId } from "../lib/guidedSessionPrompts";
import { loadEntries, loadReflections, saveEntries, saveReflections } from "../lib/storage";
import type { JournalEntry, Reflection } from "../types/journal";
import { buildMemoryFromEntries, saveMemory } from "../lib/memory";
import { generateEnhancedReflection, generateLocalReflection } from "../lib/reflection";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";

function buildSessionEntry(mode: SessionMode, answers: string[]) {
  const lines: string[] = [];
  lines.push(`Guided Session — ${mode.title}`);
  lines.push("");

  for (let i = 0; i < mode.prompts.length; i++) {
    const p = mode.prompts[i];
    const a = answers[i]?.trim() ?? "";
    if (!a) continue;
    lines.push(`${i + 1}. ${p.title}`);
    lines.push(a);
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function GuidedSessionPage({ privacyMode }: { privacyMode: boolean }) {
  const navigate = useNavigate();

  const [modeId, setModeId] = useState<SessionModeId | null>(null);
  const mode = useMemo<SessionMode | null>(() => {
    if (!modeId) return null;
    return SESSION_MODES.find((m) => m.id === modeId) ?? null;
  }, [modeId]);

  const [promptIndex, setPromptIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [enhancedNotice, setEnhancedNotice] = useState<string | null>(null);

  const [resultEntryId, setResultEntryId] = useState<string | null>(null);
  const [resultReflection, setResultReflection] = useState<Reflection | null>(null);

  const todayLabel = useMemo(() => formatDateLong(new Date()), []);

  const phase: "select" | "answer" | "review" | "result" = useMemo(() => {
    if (!mode) return "select";
    if (resultEntryId) return "result";
    if (promptIndex >= mode.prompts.length) return "review";
    return "answer";
  }, [mode, promptIndex, resultEntryId]);

  const enhancedAvailable = Boolean(import.meta.env.VITE_OPENAI_API_KEY);

  function reset() {
    setModeId(null);
    setPromptIndex(0);
    setAnswers([]);
    setSaving(false);
    setSaveError(null);
    setEnhancedNotice(null);
    setResultEntryId(null);
    setResultReflection(null);
  }

  function chooseMode(next: SessionModeId) {
    setModeId(next);
    const chosen = SESSION_MODES.find((m) => m.id === next);
    const count = chosen?.prompts.length ?? 0;
    setAnswers(Array.from({ length: count }, () => ""));
    setPromptIndex(0);
    setSaveError(null);
    setEnhancedNotice(null);
    setResultEntryId(null);
    setResultReflection(null);
  }

  function setAnswerAt(idx: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function goBack() {
    if (!mode) return;
    if (phase === "review") {
      setPromptIndex(Math.max(0, mode.prompts.length - 1));
      return;
    }
    if (phase === "answer") {
      if (promptIndex === 0) {
        reset();
        return;
      }
      setPromptIndex((i) => Math.max(0, i - 1));
    }
  }

  function goNext() {
    if (!mode) return;
    setPromptIndex((i) => Math.min(mode.prompts.length, i + 1));
  }

  async function onSave() {
    if (!mode) return;

    setSaving(true);
    setSaveError(null);
    setEnhancedNotice(null);

    try {
      const entryText = buildSessionEntry(mode, answers);

      const entry: JournalEntry = {
        id: randomId(),
        createdAt: new Date().toISOString(),
        text: entryText,
      };

      const existingEntries = loadEntries();
      const nextEntries = [entry, ...existingEntries];
      saveEntries(nextEntries);

      // Keep memory strictly derived from the current saved entries.
      const nextMem = buildMemoryFromEntries(nextEntries);
      saveMemory(nextMem);

      const shouldUseEnhanced = !privacyMode && enhancedAvailable;
      if (!privacyMode && !enhancedAvailable) {
        setEnhancedNotice(
          "Enhanced reflection isn’t available right now (no API key). Using a private, on-device reflection instead."
        );
      }

      let out;
      try {
        out = shouldUseEnhanced
          ? await generateEnhancedReflection(entryText, nextMem)
          : generateLocalReflection(entryText, nextMem);
      } catch {
        out = generateLocalReflection(entryText, nextMem);
        if (!privacyMode) {
          setEnhancedNotice(
            "Enhanced reflection couldn’t load right now. Using a private, on-device reflection instead."
          );
        }
      }

      const reflection: Reflection = {
        entryId: entry.id,
        createdAt: new Date().toISOString(),
        mirror: out.mirror,
        question: out.question ?? "",
        nudges: out.nudges ?? [],
        mode: out.mode,
      };

      const existingReflections = loadReflections();
      const nextReflections = [...existingReflections.filter((r) => r.entryId !== entry.id), reflection];
      saveReflections(nextReflections);

      setResultEntryId(entry.id);
      setResultReflection(reflection);
    } catch {
      setSaveError("Something went wrong saving your session. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guided Session</h1>
          <p className="text-slate-600">A 5‑minute journal to get unstuck — {todayLabel}.</p>
        </div>

        {phase !== "select" ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Start over
          </button>
        ) : null}
      </div>

      {phase === "select" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {SESSION_MODES.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                  <div className="mt-1 text-sm text-slate-600 leading-relaxed">{m.description}</div>
                  <div className="mt-3 text-xs text-slate-500">{m.timeEstimate}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Sparkles size={18} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => chooseMode(m.id)}
                className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Begin
              </button>
            </Card>
          ))}
        </div>
      ) : null}

      {mode && phase === "answer" ? (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{mode.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                Prompt {promptIndex + 1} of {mode.prompts.length}
              </div>
            </div>
            <div className="text-xs text-slate-500">~{Math.max(1, mode.prompts.length - promptIndex)} min left</div>
          </div>

          <div className="mt-4">
            <div className="text-base font-semibold text-slate-900">{mode.prompts[promptIndex].title}</div>
            {mode.prompts[promptIndex].helper ? (
              <div className="mt-1 text-sm text-slate-600">{mode.prompts[promptIndex].helper}</div>
            ) : null}

            <textarea
              value={answers[promptIndex] ?? ""}
              onChange={(e) => setAnswerAt(promptIndex, e.target.value)}
              placeholder={mode.prompts[promptIndex].placeholder}
              className={cn(
                "mt-3 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800",
                "min-h-[140px] focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              )}
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      {mode && phase === "review" ? (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Review</div>
              <div className="mt-1 text-sm text-slate-600">We’ll save this as one journal entry, then reflect.</div>
            </div>
          </div>

          {saveError ? <div className="mt-3 text-sm text-rose-700">{saveError}</div> : null}
          {enhancedNotice ? <div className="mt-3 text-sm text-slate-700">{enhancedNotice}</div> : null}

          <div className="mt-4 space-y-3">
            {mode.prompts.map((p, i) => {
              const a = answers[i]?.trim() ?? "";
              return (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{p.title}</div>
                      <div className={cn("mt-1 text-sm", a ? "text-slate-700" : "text-slate-500")}
                      >
                        {a ? a : "(Skipped)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromptIndex(i)}
                      className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              disabled={saving}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white",
                saving ? "opacity-80" : "hover:bg-slate-800"
              )}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Save & Reflect
            </button>
          </div>
        </Card>
      ) : null}

      {mode && phase === "result" ? (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Saved</div>
                <div className="mt-1 text-sm text-slate-600">Your session is now a journal entry.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!resultEntryId) return;
                  navigate(`/journal?entry=${encodeURIComponent(resultEntryId)}`);
                }}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open in Journal
              </button>
            </div>
          </Card>

          {enhancedNotice ? (
            <Card className="p-4">
              <div className="text-sm text-slate-700">{enhancedNotice}</div>
            </Card>
          ) : null}

          {resultReflection ? (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Reflection</div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    resultReflection.mode === "enhanced"
                      ? "bg-slate-900 text-white border-slate-900"
                      : !privacyMode
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-white/70 text-slate-700 border-slate-200"
                  )}
                  title={
                    resultReflection.mode === "enhanced"
                      ? "Generated via the OpenAI API"
                      : !privacyMode
                      ? "Enhanced failed; fell back to local reflection. Check the console/network tab for details."
                      : "Generated locally in your browser"
                  }
                >
                  {resultReflection.mode === "enhanced" ? "Enhanced" : !privacyMode ? "Local (fallback)" : "Local"}
                </span>
              </div>

              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                {resultReflection.mirror}
              </div>

              {resultReflection.question ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="text-xs font-semibold text-slate-900">A question to hold</div>
                  <div className="mt-1 text-sm text-slate-700">{resultReflection.question}</div>
                </div>
              ) : null}

              {resultReflection.nudges?.length ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="text-xs font-semibold text-slate-900">Gentle nudges</div>
                  <ul className="mt-2 space-y-1">
                    {resultReflection.nudges.map((n) => (
                      <li key={n} className="text-sm text-slate-700">
                        • {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
