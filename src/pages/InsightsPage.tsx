import { useMemo } from "react";
import { Card } from "../components/Card";
import { loadEntries } from "../lib/storage";
import { loadMemory } from "../lib/memory";
import { cn, formatDateLong } from "../lib/utils";
import {
  buildMoodTimeline,
  extractThemes,
  whatHelped,
  buildWeeklySummary,
  sentimentEmoji,
} from "../lib/insights";

function Sparkline({ values }: { values: number[] }) {
  const w = 220;
  const h = 48;
  const pad = 6;

  const min = Math.min(...values, -3);
  const max = Math.max(...values, 3);

  const scaleX = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
  const scaleY = (v: number) => {
    const t = (v - min) / Math.max(0.0001, max - min);
    return h - pad - t * (h - pad * 2);
  };

  const pts = values.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" strokeWidth="2" className="stroke-slate-900/70" />
      {/* baseline */}
      <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} className="stroke-slate-200" strokeWidth="1" />
    </svg>
  );
}

export function InsightsPage() {
  const entries = useMemo(() => loadEntries(), []);
  const memory = useMemo(() => loadMemory(), []);

  const todayLabel = useMemo(() => formatDateLong(new Date()), []);

  const timeline = useMemo(() => buildMoodTimeline(entries, 14), [entries]);
  const themes = useMemo(() => extractThemes(entries, 6), [entries]);
  const helped = useMemo(() => whatHelped(memory, timeline), [memory, timeline]);
  const weekly = useMemo(() => buildWeeklySummary(entries, themes, timeline), [entries, themes, timeline]);

  const latest = timeline[timeline.length - 1];
  const values = timeline.map((p) => p.avg);

  const hasData = entries.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-slate-600">{todayLabel} · Private patterns, gently explained.</p>
      </div>

      {!hasData ? (
        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-900">No data yet</div>
          <p className="mt-2 text-sm text-slate-700">
            Once you save a few entries, you’ll see trends here — mood over time, themes that keep showing up,
            and little “what helps” reminders (all local).
          </p>
        </Card>
      ) : (
        <>
          {/* Top row: Mood + Weekly Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Mood over time</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Last 14 days · Based on tone words (local heuristic)
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold",
                    "border-slate-200 bg-white/70 text-slate-800"
                  )}
                  title="Today’s vibe (local estimate)"
                >
                  {sentimentEmoji(latest.label)} <span className="ml-1 capitalize">{latest.label}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <Sparkline values={values} />
                <div className="text-xs text-slate-600">
                  <div className="font-semibold text-slate-900">Today</div>
                  <div className="mt-1">
                    {latest.count > 0
                      ? `Based on ${latest.count} entr${latest.count === 1 ? "y" : "ies"} today.`
                      : "No entry today — trend carries forward."}
                  </div>
                  <div className="mt-2">
                    Tip: this is a *trend lens*, not a diagnosis. It’s here to help you notice patterns.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {timeline.slice(-7).map((p, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-[11px] text-slate-500">{p.day}</div>
                    <div
                      className={cn(
                        "mt-1 rounded-2xl border px-2 py-1 text-xs font-semibold",
                        "border-slate-200 bg-white/70 text-slate-800"
                      )}
                      title={`${p.count} entry/entries`}
                    >
                      {sentimentEmoji(p.label)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-900">Weekly snapshot</div>
              <div className="mt-1 text-xs text-slate-600">A gentle summary of what your writing has been orbiting.</div>

              <div className="mt-4 rounded-2xl bg-white/70 border border-slate-200 p-4">
                <div className="text-base font-semibold text-slate-900">{weekly.headline}</div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{weekly.sentence}</p>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {weekly.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Themes + What helped */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Top themes</div>
                  <div className="text-xs text-slate-600">
                    Based on repeated phrases in your recent entries (local, private).
                  </div>
                </div>
                <div className="text-xs text-slate-500">{Math.min(entries.length, 25)} recent</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {themes.length === 0 ? (
                  <div className="text-sm text-slate-600">Write a couple more entries and themes will appear here.</div>
                ) : (
                  themes.map((t) => (
                    <div
                      key={t.label}
                      className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2"
                      title={t.examples?.[0] ?? ""}
                    >
                      <div className="text-sm font-semibold text-slate-900">{t.label}</div>
                      <div className="text-xs text-slate-600">{t.score} mention(s)</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 text-xs text-slate-600 leading-relaxed">
                These aren’t “labels” — they’re just mirrors. If one theme feels wrong, that’s a useful signal too.
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-900">What seems to help</div>
              <div className="text-xs text-slate-600">
                Pulled from your own patterns + the memory you’ve built (still local).
              </div>

              <div className="mt-3 space-y-2">
                {helped.map((h, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="text-sm font-semibold text-slate-900">{h.label}</div>
                    <div className="mt-1 text-xs text-slate-600">{h.why}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs text-slate-600">
                If something here stops being true, your journal will naturally “correct” it over time.
              </div>
            </Card>
          </div>

          {/* Bottom: quick notes for demo */}
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">How this works (for your own sanity)</div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              Insights are built from a lightweight local signal: repeated themes + a small “tone” lexicon. It’s fast,
              private, and good at showing *direction* (not judgment). When Privacy Mode is on, your reflections run
              locally; Enhanced Mode is only for the conversational reflection step, not this dashboard.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
