import type { JournalEntry } from "../../types/journal";
import { LOAD_SIGNALS, dayKey, humanJoin, normalize, splitSentences, unique } from "./shared";
import { scoreSentiment, sentimentLabel, type SentimentLabel } from "./sentiment";
import { signalPhrasesForBucket, topBucketsForText, type Theme } from "./themes";
import type { DayPoint } from "./types";

export type WeeklySummary = {
  headline: string;
  summary: string;
  toneLabel: SentimentLabel;
  bullets: string[];
};

function tokenKey(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .filter(Boolean)
    .filter((w) => w.length >= 3)
    .filter((w) => !["the", "and", "but", "when", "this", "that", "with", "your", "you", "week", "shows", "showed", "show"].includes(w));
}

function jaccard(a: string[], b: string[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function dedupeSentences(text: string) {
  const sentences = splitSentences(text);
  const kept: string[] = [];
  const keptKeys: string[][] = [];

  for (const s of sentences) {
    const keys = tokenKey(s);
    const flat = keys.join(" ");
    if (!flat) {
      kept.push(s);
      keptKeys.push(keys);
      continue;
    }

    let redundant = false;
    for (let i = 0; i < kept.length; i++) {
      const prevKeys = keptKeys[i];
      const sim = jaccard(keys, prevKeys);
      if (sim >= 0.78) {
        redundant = true;
        break;
      }
      const prevNorm = normalize(kept[i]);
      const curNorm = normalize(s);
      if (prevNorm === curNorm) {
        redundant = true;
        break;
      }
      if ((prevNorm.includes(curNorm) || curNorm.includes(prevNorm)) && Math.abs(prevNorm.length - curNorm.length) <= 30) {
        redundant = true;
        break;
      }
    }

    if (!redundant) {
      kept.push(s);
      keptKeys.push(keys);
    }
  }

  return kept.join(" ").replace(/\s+/g, " ").trim();
}

function collapseSignals(signals: string[]) {
  const set = new Set(signals);
  // If we have a more specific variant, drop the broader one.
  if (set.has("late-night meetings") && set.has("meetings")) set.delete("meetings");
  if (set.has("weekend work") && set.has("overtime")) set.delete("overtime");
  return Array.from(set);
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function buildWeeklySummary(entries: JournalEntry[], themes: Theme[], _timeline: DayPoint[]): WeeklySummary {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 7);

  const last7 = entries.filter((e) => new Date(e.createdAt) >= cutoff);

  const avg = last7.length === 0 ? 0 : last7.reduce((sum, e) => sum + scoreSentiment(e.text), 0) / last7.length;

  const toneLabel = sentimentLabel(avg);
  const topThemeLabel = themes[0]?.label ?? "your days";
  const h = hashString(`${topThemeLabel}-${toneLabel}-${last7.length}`);

  const headlineOptions: Record<SentimentLabel, string[]> = {
    very_low: ["A really heavy week — and you still showed up", "A hard stretch, with real effort in it", "A week that asked a lot of you"],
    low: ["A heavier stretch, but you showed up", "A tough week and you still wrote", "You kept going even when it was a lot"],
    mixed: ["A mixed week with edges and bright spots", "Ups and downs, but real momentum", "A week that felt varied and honest"],
    steady: ["Quiet consistency", "A steadier week", "A calm, realistic pace"],
    good: ["More lightness showing up", "A week with some wins", "A week that gave you something back"],
    very_good: ["A brighter week with momentum", "More ease showed up this week", "A week that felt lighter and more you"],
  };

  const headline = headlineOptions[toneLabel][h % headlineOptions[toneLabel].length];

  const daysWithWriting = new Set(last7.map((e) => dayKey(new Date(e.createdAt)))).size;

  const joined = normalize(last7.map((e) => e.text).join(" \n "));
  const topBuckets = topBucketsForText(joined, 2);
  const bucketSignals = unique(
    topBuckets.flatMap((b) => signalPhrasesForBucket(b.id, joined))
  ).slice(0, 3);
  const loadSignals = LOAD_SIGNALS.filter((s) => joined.includes(s));
  const extraSignals = collapseSignals(unique([...bucketSignals, ...loadSignals])).slice(0, 3);

  const bullets: string[] = [];
  bullets.push(`You wrote on ${daysWithWriting} day(s) this week.`);
  if (themes[2]) bullets.push(`Also present: ${themes[2].label}.`);

  const themeLine = themes[1]
    ? `A lot of what you wrote circled around ${themes[0]?.label ?? topThemeLabel}, with ${themes[1].label} close behind.`
    : `A lot of what you wrote circled around ${themes[0]?.label ?? topThemeLabel}.`;

  const signalLine = extraSignals.length ? `It shows up in details like ${humanJoin(extraSignals)}.` : "";

  const toneLine =
    toneLabel === "very_low" || toneLabel === "low"
      ? "The week reads tired and strained — like you were carrying more than your usual bandwidth."
      : toneLabel === "very_good" || toneLabel === "good"
      ? "The week reads lighter — like there were a few moments that gave you your energy back."
      : toneLabel === "steady"
      ? "The week reads steadier — less spiky, more contained."
      : "The week reads mixed — some pressure, some relief, and real effort in the middle.";

  const summary = dedupeSentences(`${themeLine} ${signalLine} ${toneLine}`);

  return {
    headline,
    summary,
    toneLabel,
    bullets: bullets.slice(0, 2),
  };
}
