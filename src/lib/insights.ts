// src/lib/insights.ts
import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

/**
 * Everything in this file is intentionally LOCAL.
 * No network calls. No LLM. Designed for demo-friendly, privacy-first insights.
 */

// Tiny lexicon (fast + understandable). Not “perfect sentiment”—just helpful trend signals.
const POSITIVE = [
  "good",
  "great",
  "nice",
  "happy",
  "excited",
  "calm",
  "relieved",
  "proud",
  "grateful",
  "fun",
  "love",
  "yummy",
  "peaceful",
  "better",
  "win",
  "progress",
  "energized",
  "hopeful",
  "content",
  "rested",
];

const NEGATIVE = [
  "bad",
  "sad",
  "angry",
  "mad",
  "upset",
  "anxious",
  "stress",
  "stressed",
  "overwhelmed",
  "tired",
  "exhausted",
  "lonely",
  "panic",
  "burnout",
  "drained",
  "worst",
  "pressure",
  "guilt",
  "ashamed",
  "frustrated",
  "annoyed",
  "irritated",
  "hurt",
];

const INTENSIFIERS = ["very", "really", "so", "super", "extremely", "too"];
const SOFTENERS = ["kind of", "kinda", "a bit", "somewhat", "maybe", "ig", "i guess"];

const STOPWORDS = new Set(
  [
    "i",
    "me",
    "my",
    "mine",
    "we",
    "our",
    "you",
    "your",
    "it",
    "this",
    "that",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "so",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "at",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "just",
    "like",
    "really",
    "very",
    "today",
    "yesterday",
    "tomorrow",
    "im",
    "i'm",
    "dont",
    "don't",
    "cant",
    "can't",
    "didnt",
    "didn't",
    "wanna",
    "want",
    "wanted",
    "feel",
    "feels",
    "feeling",
    "felt",
    "thing",
    "things",
    "stuff",
    "lot",
    "kinda",
    "kind",
    "maybe",
    "yeah",
    "uh",
    "um",
  ].map((s) => s.toLowerCase())
);

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string) {
  const t = normalize(text);
  if (!t) return [];
  return t.split(" ").filter(Boolean);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export type SentimentLabel = "low" | "mixed" | "steady" | "good" | "bright";

export function scoreSentiment(text: string): number {
  const raw = normalize(text);
  if (!raw) return 0;

  const tokens = tokenize(raw);
  if (tokens.length === 0) return 0;

  // Short-gibberish guard (demo-friendly)
  if (tokens.length <= 2 && raw.length <= 3) return 0;

  let score = 0;

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];

    const prev = tokens[i - 1] ?? "";
    const prev2 = tokens[i - 2] ?? "";
    const prevPhrase = `${prev2} ${prev}`.trim();

    let weight = 1;

    if (INTENSIFIERS.includes(prev)) weight += 0.5;
    if (SOFTENERS.includes(prevPhrase)) weight -= 0.25;

    if (POSITIVE.includes(w)) score += 1 * weight;
    if (NEGATIVE.includes(w)) score -= 1 * weight;
  }

  // Normalize by length (so huge entries don't dominate)
  const norm = score / Math.sqrt(tokens.length);
  return clamp(norm, -3, 3);
}

export function sentimentLabel(score: number): SentimentLabel {
  if (score <= -1.1) return "low";
  if (score <= -0.3) return "mixed";
  if (score < 0.3) return "steady";
  if (score < 1.1) return "good";
  return "bright";
}

export function sentimentEmoji(label: SentimentLabel): string {
  switch (label) {
    case "low":
      return "😞";
    case "mixed":
      return "😕";
    case "steady":
      return "😌";
    case "good":
      return "🙂";
    case "bright":
      return "😊";
  }
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  // local date bucket (good enough for prototype)
  return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

export type DayPoint = {
  day: string;
  isoDayStart: string;
  avg: number;
  count: number;
  label: SentimentLabel;
};

export function buildMoodTimeline(entries: JournalEntry[], days = 14): DayPoint[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { sum: number; n: number }>();

  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (d < start) continue;
    const key = dayKey(e.createdAt);
    const s = scoreSentiment(e.text);
    const b = buckets.get(key) ?? { sum: 0, n: 0 };
    b.sum += s;
    b.n += 1;
    buckets.set(key, b);
  }

  const points: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });

    const b = buckets.get(key);
    const avg = b ? b.sum / b.n : 0;
    points.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      isoDayStart: d.toISOString(),
      avg: clamp(avg, -3, 3),
      count: b?.n ?? 0,
      label: sentimentLabel(avg),
    });
  }

  return points;
}

type Theme = { label: string; score: number; examples: string[] };

function cleanWord(w: string) {
  return w.replace(/^'+|'+$/g, "").replace(/^-+|-+$/g, "");
}

export function extractThemes(entries: JournalEntry[], topK = 6): Theme[] {
  // Pull from recent entries to feel “current”
  const recent = entries.slice(0, 25);

  const freq = new Map<string, { count: number; examples: string[] }>();

  for (const e of recent) {
    const raw = normalize(e.text);
    const words = tokenize(raw)
      .map(cleanWord)
      .filter((w) => w.length >= 4)
      .filter((w) => !STOPWORDS.has(w));

    // bigrams help get “work stress”, “family stuff”
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const next = words[i + 1];

      const add = (k: string) => {
        const cur = freq.get(k) ?? { count: 0, examples: [] };
        cur.count += 1;
        if (cur.examples.length < 2) cur.examples.push(e.text.slice(0, 140));
        freq.set(k, cur);
      };

      add(w);

      if (next && !STOPWORDS.has(next)) {
        add(`${w} ${next}`);
      }
    }
  }

  const ranked = Array.from(freq.entries())
    .map(([label, v]) => ({
      label,
      score: v.count,
      examples: v.examples,
    }))
    // prefer phrases a bit (bigrams) when they exist
    .sort((a, b) => b.score - a.score || b.label.length - a.label.length)
    .slice(0, topK);

  // Make labels nicer
  return ranked.map((t) => ({
    ...t,
    label: t.label.replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}

export type HelpItem = { label: string; why: string };

export function whatHelped(memory: UserMemory, timeline: DayPoint[]): HelpItem[] {
  // We’ll keep this gentle + personal: highlight coping/wins if present, otherwise “micro” tips.
  const items: HelpItem[] = [];

  // Memory might include things like walks, music, talking to friends, etc.
  // We surface them sparingly.
  const coping = memory.coping?.slice(0, 3) ?? [];
  const wins = memory.wins?.slice(0, 2) ?? [];

  const last = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];

  const trend =
    last && prev ? last.avg - prev.avg : 0;

  if (coping.length) {
    for (const c of coping) {
      items.push({
        label: c,
        why:
          trend > 0.4
            ? "This tends to show up around lighter days for you."
            : "This might be a steadying option to keep nearby.",
      });
    }
  }

  if (wins.length) {
    for (const w of wins) {
      items.push({
        label: w,
        why: "Worth holding onto — your brain is already tracking what matters.",
      });
    }
  }

  if (items.length === 0) {
    items.push(
      { label: "A 2-minute reset", why: "Tiny counts. One sip of water, one unclenched jaw, one slow breath." },
      { label: "Name the main thing", why: "Even one sentence can turn a blur into a shape you can work with." }
    );
  }

  return items.slice(0, 5);
}

function hashString(s: string) {
  // deterministic “variety” for phrasing (so it doesn’t feel like a template)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type WeeklySummary = {
  headline: string;
  sentence: string;
  bullets: string[];
};

export function buildWeeklySummary(entries: JournalEntry[], themes: Theme[], timeline: DayPoint[]): WeeklySummary {
  const last7 = entries.filter((e) => {
    const d = new Date(e.createdAt);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });

  const avg =
    last7.length === 0
      ? 0
      : last7.reduce((sum, e) => sum + scoreSentiment(e.text), 0) / last7.length;

  const label = sentimentLabel(avg);
  const topTheme = themes[0]?.label ?? "Your days";
  const h = hashString(`${topTheme}-${label}-${last7.length}`);

  const headlineOptions = {
    low: ["A heavier stretch, but you showed up", "A tough week — and you still wrote", "You kept going, even when it was a lot"],
    mixed: ["A mixed week — a little messy, a little honest", "Ups and downs, but real momentum", "A week with edges — and bright spots"],
    steady: ["A steadier week", "Quiet consistency", "A calm, realistic pace"],
    good: ["More light days than not", "Some real ease showed up", "You caught a few wins"],
    bright: ["A bright stretch", "A strong run of good days", "A week that felt alive"],
  } as const;

  const headline = headlineOptions[label][h % headlineOptions[label].length];

  const sentenceOptions = [
    `Most of your writing circled around **${topTheme}**, and your tone landed **${label}** overall — not perfect, just honest.`,
    `A lot of your week touched **${topTheme}**. The overall tone felt **${label}**, with a few moments that really stood out.`,
    `Across the week, **${topTheme}** kept showing up. Your tone was **${label}** — and you still made space to reflect.`,
  ];

  const sentence = sentenceOptions[h % sentenceOptions.length];

  const bullets: string[] = [];

  const daysWithEntries = timeline.filter((p) => p.count > 0).length;
  if (daysWithEntries > 0) {
    bullets.push(`You wrote on **${daysWithEntries}** day(s) recently — that consistency matters more than perfection.`);
  }

  if (themes[1]) {
    bullets.push(`A second thread that kept popping up: **${themes[1].label}**.`);
  }

  // trend bullet
  if (timeline.length >= 2) {
    const t = timeline[timeline.length - 1].avg - timeline[timeline.length - 2].avg;
    if (t > 0.5) bullets.push("Your last couple days look a bit lighter than the start — small but real shift.");
    else if (t < -0.5) bullets.push("The last couple days look heavier — might be a good week for softer expectations.");
    else bullets.push("Your mood trend looks pretty stable — steady can be a win.");
  }

  // keep bullets tight
  return {
    headline,
    sentence,
    bullets: bullets.slice(0, 3),
  };
}
