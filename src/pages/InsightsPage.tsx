// src/pages/InsightsPage.tsx
import { useMemo, useState } from "react";
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
  type Theme,
  type MoodPoint,
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
      <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} className="stroke-slate-200" strokeWidth="1" />
    </svg>
  );
}

function ThemeCard({
  theme,
  expanded,
  onToggle,
}: {
  theme: Theme;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "text-left rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 hover:bg-slate-50",
        "transition"
      )}
      title="Click to expand"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{theme.label}</div>
          <div className="text-xs text-slate-600">{theme.score} mention(s)</div>
        </div>
        <div className="text-xs text-slate-500">{expanded ? "Hide" : "Details"}</div>
      </div>

      {expanded && (
        <div className="mt-2 text-xs text-slate-700 leading-relaxed space-y-2">
          <div>{theme.summary}</div>
          {theme.examples?.length ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-2">
              <div className="text-[11px] font-semibold text-slate-700">Example</div>
              <div className="mt-1 text-[11px] text-slate-600">
                “{theme.examples[0]}{theme.examples[0].length >= 160 ? "…" : ""}”
              </div>
            </div>
          ) : null}
        </div>
      )}
    </button>
  );
}

function entriesForDay(entries: { createdAt: string; text: string }[], dateKey: string) {
  return entries.filter((e) => e.createdAt.slice(0, 10) === dateKey);
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

  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<MoodPoint | null>(null);

  const activeDayEntries = useMemo(() => {
    if (!activeDay) return [];
    const list = entriesForDay(entries, activeDay.dateKey);
    return list.slice(0, 6).map((e) => ({
      when: new Date(e.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      text: e.text.trim().replace(/\s+/g, " "),
    }));
  }, [activeDay, entries]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-slate-600">{todayLabel} · Patterns, softly surfaced.</p>

        <div className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold">Privacy note:</span>
          <span>Insights are generated locally on your device (no journal text leaves your browser).</span>
        </div>
      </div>

      {!hasData ? (
        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-900">No data yet</div>
          <p className="mt-2 text-sm text-slate-700">
            Save a few entries and you’ll see trends here: mood over time, themes that repeat, and what tends to help.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Mood over time</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Last 14 days · A lightweight tone trend (not a diagnosis)
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold",
                    "border-slate-200 bg-white/70 text-slate-800"
                  )}
                  title="Today’s vibe estimate"
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
                      : "No entry today. Trend carries forward."}
                  </div>
                  <div className="mt-2">
                    Tip: click a day below to see the entries that contributed to it.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {timeline.slice(-7).map((p, idx) => {
                  const isActive = activeDay?.dateKey === p.dateKey;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveDay((cur) => (cur?.dateKey === p.dateKey ? null : p))}
                      className="text-center"
                      title={p.count ? `${p.count} entr${p.count === 1 ? "y" : "ies"} on this day` : "No entries this day"}
                    >
                      <div className="text-[11px] text-slate-500">{p.day}</div>
                      <div
                        className={cn(
                          "mt-1 rounded-2xl border px-2 py-1 text-xs font-semibold",
                          "bg-white/70 text-slate-800 border-slate-200",
                          isActive && "border-slate-900 bg-white"
                        )}
                      >
                        {sentimentEmoji(p.label)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeDay && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {activeDay.dateKey} · {sentimentEmoji(activeDay.label)}{" "}
                      <span className="capitalize">{activeDay.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDay(null)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>

                  {activeDayEntries.length === 0 ? (
                    <div className="mt-2 text-xs text-slate-600">No entries saved that day.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {activeDayEntries.map((e, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white/80 p-2">
                          <div className="text-[11px] text-slate-500">{e.when}</div>
                          <div className="mt-1 text-xs text-slate-700 line-clamp-2">{e.text}</div>
                        </div>
                      ))}
                      <div className="text-[11px] text-slate-500">
                        This is just a lens. If the “vibe” feels wrong, that’s useful feedback too.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-900">Weekly snapshot</div>
              <div className="mt-1 text-xs text-slate-600">
                A short summary that tries to reflect your week without over-reading it.
              </div>

              <div className="mt-4 rounded-2xl bg-white/70 border border-slate-200 p-4">
                <div className="text-base font-semibold text-slate-900">{weekly.headline}</div>

                <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                  {weekly.sentencePrefix} <strong>{weekly.theme}</strong>. The overall tone felt{" "}
                  <strong className="capitalize">{weekly.toneLabel}</strong>. {weekly.sentenceSuffix}
                </p>

                <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {weekly.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>

                <div className="mt-3 text-xs text-slate-600">
                  If this doesn’t match your week, that’s useful too. It means the labels need to learn what matters.
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Top themes</div>
                  <div className="text-xs text-slate-600">Click a theme for a quick explanation and an example.</div>
                </div>
                <div className="text-xs text-slate-500">{Math.min(entries.length, 35)} recent</div>
              </div>

              <div className="mt-3 grid gap-2">
                {themes.length === 0 ? (
                  <div className="text-sm text-slate-600">Write a couple more entries and themes will show up here.</div>
                ) : (
                  themes.map((t) => (
                    <ThemeCard
                      key={t.id}
                      theme={t}
                      expanded={expandedThemeId === t.id}
                      onToggle={() => setExpandedThemeId((cur) => (cur === t.id ? null : t.id))}
                    />
                  ))
                )}
              </div>

              <div className="mt-4 text-xs text-slate-600 leading-relaxed">
                Themes are meant to be a mirror, not a verdict. If one feels off, that’s information.
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-900">What seems to help</div>
              <div className="text-xs text-slate-600">Grouped so it stays useful (not repetitive).</div>

              <div className="mt-3 space-y-2">
                {helped.map((h, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="text-sm font-semibold text-slate-900">{h.label}</div>
                    <div className="mt-1 text-xs text-slate-600">{h.detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs text-slate-600">
                If something stops being true, your journal will naturally correct it over time.
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
