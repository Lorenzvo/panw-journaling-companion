import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

/**
 * Local-only Insights
 * - No network calls
 * - No LLM
 * - Designed to be demo-friendly, privacy-first, and understandable
 */

const POSITIVE = [
  "good","great","nice","happy","excited","calm","relieved","proud","grateful","fun","love",
  "peaceful","better","win","progress","energized","hopeful","content","rested",
  "connected","safe","supported","productive","accomplished","motivated","light",
];

const NEGATIVE = [
  "bad","sad","angry","mad","upset","anxious","worry","worried","stress","stressed","overwhelmed",
  "tired","exhausted","lonely","panic","burnout","drained","worst","pressure","guilt","ashamed",
  "frustrated","annoyed","irritated","hurt","resent","numb","trapped","overwork","overworked",
  "deadline","late","conflict",
];

const INTENSIFIERS = ["very","really","so","super","extremely","too"];
const SOFTENERS = ["kind of","kinda","a bit","somewhat","maybe","ig","i guess"];

const STOPWORDS = new Set(
  [
    "i","me","my","mine","we","our","you","your","it","this","that","the","a","an","and","or","but",
    "so","to","of","in","on","for","with","at","as","is","are","was","were","be","been","being",
    "just","like","really","very","today","yesterday","tomorrow","im","i'm","dont","don't","cant","can't",
    "didnt","didn't","wanna","want","wanted","feel","feels","feeling","felt","thing","things","stuff",
    "lot","kinda","kind","maybe","yeah","uh","um","also","though","even","still","anyway",
    // words that create useless “themes”
    "because","time","nice","pretty","really","very","some","more","less","much",
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
    case "low": return "😞";
    case "mixed": return "😕";
    case "steady": return "😌";
    case "good": return "🙂";
    case "bright": return "😊";
  }
}

export function dayKey(iso: string) {
  const d = new Date(iso);
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
    const key = dayKey(d.toISOString());

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

export type Theme = {
  id: string;
  label: string;
  score: number;
  examples: string[]; // short snippets
  summary: string;    // 1–2 sentence explanation
};

function cleanWord(w: string) {
  return w.replace(/^'+|'+$/g, "").replace(/^-+|-+$/g, "");
}

function normalizeThemeLabel(label: string) {
  // collapse “pretty nice” -> “nice” (and then STOPWORDS will remove “nice” anyway)
  const t = label.toLowerCase().trim();

  const stripped = t
    .replace(/^(pretty|really|very|so|super)\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return stripped;
}

function isJunkTheme(label: string) {
  const t = normalizeThemeLabel(label);
  if (!t) return true;
  if (STOPWORDS.has(t)) return true;
  if (t.length < 4) return true;
  return false;
}

function dedupeThemes(raw: Array<{ label: string; score: number; examples: string[] }>) {
  // Collapse normalized labels + prefer more specific phrases
  const map = new Map<string, { label: string; score: number; examples: string[] }>();

  for (const t of raw) {
    const key = normalizeThemeLabel(t.label);
    if (isJunkTheme(key)) continue;

    const cur = map.get(key);
    if (!cur) {
      map.set(key, { label: key, score: t.score, examples: t.examples });
      continue;
    }
    cur.score += t.score;
    cur.examples = Array.from(new Set([...cur.examples, ...t.examples])).slice(0, 2);
    map.set(key, cur);
  }

  let list = Array.from(map.values());

  // Remove overlaps: if “work meeting” exists, drop “meeting” unless meeting is dominant
  list = list.filter((t) => {
    const tWords = t.label.split(" ");
    if (tWords.length === 1) {
      const longer = list.find((x) => x.label.includes(t.label) && x.label !== t.label && x.score >= t.score);
      if (longer) return false;
    }
    return true;
  });

  return list;
}

function capitalizeWords(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeThemeSummary(label: string, examples: string[]) {
  const l = label.toLowerCase();
  if (l.includes("work") || l.includes("client") || l.includes("meeting") || l.includes("deadline")) {
    return "Work-related pressure has been showing up repeatedly — especially scheduling and load.";
  }
  if (l.includes("friend") || l.includes("family") || l.includes("relationship") || l.includes("lonely")) {
    return "Connection / relationships have been a recurring focus — how you feel around people, not just what happened.";
  }
  if (l.includes("anger") || l.includes("anxious") || l.includes("stress") || l.includes("overwhelmed")) {
    return "Emotional intensity has been coming up — this theme often pairs with uncertainty or overloaded days.";
  }
  if (l.includes("sleep") || l.includes("rest") || l.includes("tired")) {
    return "Energy and recovery are a thread — fatigue may be shaping how the week feels.";
  }

  // fallback: still specific-ish, no fluff
  const ex = examples[0]?.slice(0, 80);
  return ex ? "This phrase keeps appearing in your writing — it may point to what’s taking up mental space." : "A recurring thread in your writing recently.";
}

export function extractThemes(entries: JournalEntry[], topK = 6): Theme[] {
  const recent = entries.slice(0, 35);

  const freq = new Map<string, { count: number; examples: string[] }>();

  for (const e of recent) {
    const raw = normalize(e.text);
    const words = tokenize(raw)
      .map(cleanWord)
      .filter((w) => w.length >= 4)
      .filter((w) => !STOPWORDS.has(w));

    const add = (k: string) => {
      const cur = freq.get(k) ?? { count: 0, examples: [] };
      cur.count += 1;
      if (cur.examples.length < 2) cur.examples.push(e.text.slice(0, 160));
      freq.set(k, cur);
    };

    // unigrams + bigrams
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const next = words[i + 1];

      add(w);

      if (next && !STOPWORDS.has(next)) {
        add(`${w} ${next}`);
      }
    }
  }

  const rawRanked = Array.from(freq.entries())
    .map(([label, v]) => ({ label, score: v.count, examples: v.examples }))
    .sort((a, b) => b.score - a.score || b.label.length - a.label.length)
    .slice(0, topK * 4);

  const deduped = dedupeThemes(rawRanked)
    .sort((a, b) => b.score - a.score || b.label.length - a.label.length)
    .slice(0, topK);

  return deduped.map((t, idx) => {
    const pretty = capitalizeWords(t.label);
    return {
      id: `${idx}-${t.label.replace(/\s+/g, "-")}`,
      label: pretty,
      score: t.score,
      examples: t.examples,
      summary: makeThemeSummary(t.label, t.examples),
    };
  });
}

export type HelpItem = { label: string; detail: string };

function canonicalHelp(label: string) {
  const t = label.toLowerCase();

  if (/(walk|walking|movement|move|exercise|run|gym|workout)/.test(t)) return "Movement";
  if (/(music|song|playlist)/.test(t)) return "Music";
  if (/(sleep|rest|nap)/.test(t)) return "Rest";
  if (/(talk|friend|friends|call|text|hangout)/.test(t)) return "Connection";
  if (/(write|journal|reflect)/.test(t)) return "Writing it out";

  return label;
}

export function whatHelped(memory: UserMemory, timeline: DayPoint[]): HelpItem[] {
  const items: HelpItem[] = [];

  const last = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];
  const trend = last && prev ? last.avg - prev.avg : 0;

  const raw = (memory.coping ?? []).slice(0, 6);
  const canon = new Map<string, number>();
  for (const r of raw) {
    const c = canonicalHelp(r);
    canon.set(c, (canon.get(c) ?? 0) + 1);
  }

  const ranked = Array.from(canon.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => label);

  for (const label of ranked) {
    const detail =
      label === "Movement"
        ? trend > 0.4
          ? "This tends to pair with your lighter days — it’s like a reset button you can actually access."
          : "When things feel heavy, movement can be a gentle exit ramp (even a short walk counts)."
        : label === "Connection"
        ? "Being around the right people seems to soften the day — not fixing it, just making it less alone."
        : label === "Rest"
        ? "Your energy is part of the story. Protecting rest tends to improve everything downstream."
        : label === "Music"
        ? "Music shows up as a mood-shifter for you — useful when your brain won’t stop looping."
        : "This is a pattern you’ve returned to more than once.";

    items.push({ label, detail });
  }

  if (items.length === 0) {
    items.push(
      { label: "A 2-minute reset", detail: "Tiny counts. One sip of water, one unclenched jaw, one slow breath." },
      { label: "Name the main thing", detail: "Even one sentence can turn a blur into a shape you can work with." }
    );
  }

  return items;
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type WeeklySummary = {
  headline: string;
  theme: string;
  toneLabel: SentimentLabel;
  sentencePrefix: string;
  sentenceSuffix: string;
  bullets: string[];
};

export function buildWeeklySummary(entries: JournalEntry[], themes: Theme[], timeline: DayPoint[]): WeeklySummary {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const last7 = entries.filter((e) => new Date(e.createdAt) >= cutoff);

  const avg =
    last7.length === 0 ? 0 : last7.reduce((sum, e) => sum + scoreSentiment(e.text), 0) / last7.length;

  const toneLabel = sentimentLabel(avg);
  const topTheme = themes[0]?.label ?? "Your days";
  const h = hashString(`${topTheme}-${toneLabel}-${last7.length}`);

  const headlineOptions: Record<SentimentLabel, string[]> = {
    low: ["A heavier stretch, but you showed up", "A tough week — and you still wrote", "You kept going, even when it was a lot"],
    mixed: ["A mixed week — messy and honest", "Ups and downs, but real momentum", "A week with edges — and bright spots"],
    steady: ["Quiet consistency", "A steadier week", "A calm, realistic pace"],
    good: ["More light days than not", "Some real ease showed up", "You caught a few wins"],
    bright: ["A bright stretch", "A strong run of good days", "A week that felt alive"],
  };

  const headline = headlineOptions[toneLabel][h % headlineOptions[toneLabel].length];

  const sentencePrefixOptions = [
    "A lot of your week touched",
    "Your entries kept circling back to",
    "The thread that showed up most was",
  ];
  const sentencePrefix = sentencePrefixOptions[h % sentencePrefixOptions.length];

  const sentenceSuffixOptions = [
    "overall — not perfect, just honest.",
    "overall, with a few moments that really stood out.",
    "in a way that feels real, not over-polished.",
  ];
  const sentenceSuffix = sentenceSuffixOptions[h % sentenceSuffixOptions.length];

  const bullets: string[] = [];

  const daysWithEntries = timeline.filter((p) => p.count > 0).length;
  bullets.push(`You wrote on **${daysWithEntries}** day(s) recently — consistency matters more than perfection.`);

  if (themes[1]) bullets.push(`A second thread that kept popping up: **${themes[1].label}**.`);

  if (timeline.length >= 2) {
    const t = timeline[timeline.length - 1].avg - timeline[timeline.length - 2].avg;
    if (t > 0.5) bullets.push("The last couple days look a bit lighter than earlier — small but real shift.");
    else if (t < -0.5) bullets.push("The last couple days look heavier — might be a good week for softer expectations.");
    else bullets.push("Your mood trend looks pretty stable — steady can be a win.");
  }

  return {
    headline,
    theme: topTheme,
    toneLabel,
    sentencePrefix,
    sentenceSuffix,
    bullets: bullets.slice(0, 3),
  };
}