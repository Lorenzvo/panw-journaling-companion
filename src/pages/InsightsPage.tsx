// src/pages/InsightsPage.tsx
import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { loadEntries } from "../lib/storage";
import { loadMemory } from "../lib/memory";
import { cn, formatDateLong } from "../lib/utils";
import type { JournalEntry } from "../types/journal";
import {
  buildMoodTimeline,
  extractThemes,
  whatHelped,
  buildWeeklySummary,
  sentimentEmoji,
  sentimentLabelTitle,
  explainDayMood,
  type Theme,
  type MoodPoint,
} from "../lib/insights/index";

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

  const pts = values.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));

  const pathD = (() => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    // Catmull-Rom to Bezier for a smoother sparkline.
    const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
    }
    return d.join(" ");
  })();

  const last = pts[pts.length - 1];

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={pathD} fill="none" strokeWidth="2.25" className="stroke-slate-900/70" strokeLinecap="round" />
      {last ? <circle cx={last.x} cy={last.y} r={2.25} className="fill-slate-900/70" /> : null}
    </svg>
  );
}

function ThemeIcon({ id }: { id: string }) {
  const base = "h-4 w-4 text-slate-900";
  switch (id) {
    case "relationships":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 6 6 6c2 0 3.5 1.2 6 3.5C14.5 7.2 16 6 18 6c3 0 5.5 2.5 3.5 6.5C19 16.65 12 21 12 21z" />
        </svg>
      );
    case "work":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
          <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
          <path d="M9 12h6" />
        </svg>
      );
    case "selfcare":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-6-3.5-8-7.5C2.2 10 4 7.5 7 7.5c1.7 0 3.1 1 5 2.8 1.9-1.8 3.3-2.8 5-2.8 3 0 4.8 2.5 3 6-2 4-8 7.5-8 7.5z" />
        </svg>
      );
    case "sleep":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a6.5 6.5 0 1 0 9.5 9.5z" />
        </svg>
      );
    case "finances":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "selfworth":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 6 6 6c2 0 3.5 1.2 6 3.5C14.5 7.2 16 6 18 6c3 0 5.5 2.5 3.5 6.5C19 16.65 12 21 12 21z" />
          <path d="M9.5 10.5l5 5" />
          <path d="M14.5 10.5l-5 5" />
        </svg>
      );
    case "hobbies":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h10v18H7z" />
          <path d="M7 7h10" />
          <path d="M10 3v18" />
        </svg>
      );
    case "outdoors":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 20h18" />
          <path d="M6 20l6-14 6 14" />
          <path d="M10 13h4" />
        </svg>
      );
    case "pets":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19c-3 0-5-2-5-4 0-1.5 1-3 2.5-3.5" />
          <path d="M12 19c3 0 5-2 5-4 0-1.5-1-3-2.5-3.5" />
          <path d="M9.5 10.5c-.8 0-1.5-.7-1.5-1.5S8.7 7.5 9.5 7.5 11 8.2 11 9s-.7 1.5-1.5 1.5z" />
          <path d="M14.5 10.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5S16 8.2 16 9s-.7 1.5-1.5 1.5z" />
          <path d="M12 14.5c1 0 2 .7 2 1.5s-1 2-2 2-2-1.2-2-2 .9-1.5 2-1.5z" />
        </svg>
      );
    case "therapy":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      );
    case "faith":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M6 7h12" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </svg>
      );
  }
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
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ThemeIcon id={theme.id} />
            <span>{theme.label}</span>
          </div>
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

function entriesForDay(entries: JournalEntry[], dateKey: string) {
  return entries.filter((e) => {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.getTime())) return e.createdAt.slice(0, 10) === dateKey;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}` === dateKey;
  });
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

  const activeDayEntriesCount = useMemo(() => {
    if (!activeDay) return 0;
    return entriesForDay(entries, activeDay.dateKey).length;
  }, [activeDay, entries]);

  const activeDayWhy = useMemo(() => {
    if (!activeDay) return null;
    const dayEntries = entriesForDay(entries, activeDay.dateKey);
    return explainDayMood(dayEntries, activeDay);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Mood over time</div>
                  <div className="mt-1 text-xs text-slate-600">Last 14 days · A lightweight tone trend (not a diagnosis)</div>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold",
                    "border-slate-200 bg-white/70 text-slate-800"
                  )}
                  title="Today’s vibe estimate"
                >
                  {sentimentEmoji(latest.label)} <span className="ml-1 capitalize">{sentimentLabelTitle(latest.label)}</span>
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
                  <div className="mt-2">Tip: click a day below for a quick “why this mood” read.</div>
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
                      <span className="capitalize">{sentimentLabelTitle(activeDay.label)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDay(null)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>

                  {activeDayEntriesCount === 0 ? (
                    <div className="mt-2 text-xs text-slate-600">No entries saved that day.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {activeDayWhy ? (
                        <div className="rounded-xl border border-slate-200 bg-white/80 p-2">
                          <div className="text-[11px] font-semibold text-slate-700">Why this mood</div>
                          <div className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line">{activeDayWhy.blurb}</div>
                        </div>
                      ) : null}

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
              <div className="mt-1 text-xs text-slate-600">A short summary that tries to reflect your week without over-reading it.</div>

              <div className="mt-4 rounded-2xl bg-white/70 border border-slate-200 p-4">
                <div className="text-base font-semibold text-slate-900">{weekly.headline}</div>

                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{weekly.summary}</p>

                <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
                  {weekly.bullets.map((b, i) => (
                    <li key={i} className="leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 text-xs text-slate-600">
                  If this doesn’t match your week, that’s useful too. It means the labels need to learn what matters.
                </div>
              </div>
            </Card>

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

              <div className="mt-4 text-xs text-slate-600 leading-relaxed">Themes are meant to be a mirror, not a verdict. If one feels off, that’s information.</div>
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

              <div className="mt-4 text-xs text-slate-600">If something stops being true, your journal will naturally correct it over time.</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
