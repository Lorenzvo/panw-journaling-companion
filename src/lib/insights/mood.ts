import type { JournalEntry } from "../../types/journal";
import {
  LOAD_SIGNALS,
  POSITIVE,
  NEGATIVE,
  clamp,
  countHits,
  dayKey,
  normalize,
  shortDay,
  unique,
} from "./shared";
import { sentimentLabel } from "./sentiment";
import type { MoodPoint, DayPoint } from "./types";
import { scoreSentiment, type SentimentLabel } from "./sentiment";
import { signalPhrasesForBucket, topBucketsForText } from "./themes";

type DayMoodExplanation = {
  blurb: string;
  bullets: string[];
};

function summarizeDaySignals(entries: JournalEntry[]) {
  const joined = normalize(entries.map((e) => e.text).join(" \n "));
  const pos = countHits(joined, POSITIVE);
  const neg = countHits(joined, NEGATIVE);
  const load = LOAD_SIGNALS.reduce((acc, s) => (joined.includes(s) ? acc + 1 : acc), 0);
  return { joined, pos, neg, load };
}

export function explainDayMood(dayEntries: JournalEntry[], point: MoodPoint): DayMoodExplanation {
  if (!dayEntries.length) {
    return {
      blurb: "No entries were saved on this day, so the trend line just carries forward.",
      bullets: [],
    };
  }

  const scores = dayEntries.map((e) => scoreSentiment(e.text));
  const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const { joined, pos, neg, load } = summarizeDaySignals(dayEntries);
  const top = topBucketsForText(joined, 2);

  const topSignals = top[0]?.id ? signalPhrasesForBucket(top[0].id, joined) : [];
  const loadSignals = LOAD_SIGNALS.filter((s) => joined.includes(s));
  const signals = unique([...topSignals, ...loadSignals]).slice(0, 3);

  const labelTitle = point.label === "very_low" ? "very low" : point.label === "very_good" ? "very good" : point.label;
  const intensityHint = Math.abs(avg) >= 2 ? "strong" : Math.abs(avg) >= 1.1 ? "clear" : "subtle";

  const threads = [top[0]?.label, top[1]?.label].filter(Boolean) as string[];
  const threadText =
    threads.length === 0
      ? ""
      : threads.length === 1
      ? ` ${threads[0]} kept showing up.`
      : ` ${threads[0]} and ${threads[1]} kept showing up.`;

  const mixText =
    min < -1.8 && max > 1.2
      ? " It wasn’t one-note — there were both heavier and lighter moments."
      : neg > pos + 1
      ? " The heavier wording showed up more often than the lighter wording."
      : pos > neg + 1
      ? " The lighter wording showed up more often than the heavier wording."
      : "";

  const pressureText = load >= 2 ? " A lot of the stress language clustered around pace/expectations." : "";

  const blurb = `This day was marked as ${labelTitle} because the emotional signal felt ${intensityHint}.${threadText}${mixText}${pressureText}`;

  const bullets: string[] = [];
  if (signals.length) bullets.push(`You named: ${signals.join(", ")}.`);
  return { blurb, bullets: bullets.slice(0, 1) };
}

export function buildMoodTimeline(entries: JournalEntry[], days = 14): DayPoint[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { sum: number; n: number }>();

  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d < start) continue;
    const k = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
    const s = scoreSentiment(e.text);
    const cur = buckets.get(k) ?? { sum: 0, n: 0 };
    cur.sum += s;
    cur.n += 1;
    buckets.set(k, cur);
  }

  const out: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = dayKey(d);
    const cur = buckets.get(k);
    const rawAvg = cur ? cur.sum / Math.max(1, cur.n) : out.length ? out[out.length - 1].avg * 0.92 : 0;
    const avg = clamp(rawAvg, -3, 3);

    out.push({
      dateKey: k,
      day: shortDay(d),
      avg,
      label: sentimentLabel(avg),
      count: cur?.n ?? 0,
    });
  }

  return out;
}

export type { DayMoodExplanation };
export type { SentimentLabel };
