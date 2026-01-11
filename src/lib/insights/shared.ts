// Shared, on-device text heuristics for Insights.
// Keep utilities deterministic and free of DOM/network dependencies.

export const POSITIVE = [
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
  "peaceful",
  "better",
  "win",
  "progress",
  "energized",
  "hopeful",
  "content",
  "rested",
  "connected",
  "safe",
  "supported",
  "productive",
  "accomplished",
  "motivated",
  "light",
  "steady",
  "clear",
  "proud of myself",
  "went well",
  "felt seen",
  "felt understood",
  "less anxious",
  "more like myself",
  "good enough",
  "made progress",
];

export const NEGATIVE = [
  "bad",
  "awful",
  "worst",
  "tired",
  "exhausted",
  "overwhelmed",
  "stressed",
  "anxious",
  "angry",
  "sad",
  "upset",
  "burnt out",
  "burned out",
  "drained",
  "panic",
  "lonely",
  "hopeless",
  "heavy",
  "numb",
  "spiral",
  "irritated",
  "frustrated",
  "tense",
  "on edge",
  "shame",
  "guilt",
  "worthless",
  "stuck",
  "can't",
  "cant",
  "no time",
  "too much",
  "last minute",
  "deadline",
  "pressure",
  "hate",
  "hate myself",
  "eh whatever",
  "whatever",
  "i'm done",
  "im done",
  "checked out",
  "shut down",
  "on the verge",
  "dreading",
  "stressed out",
  "can't keep up",
  "cant keep up",
];

export const INTENSIFIERS = [
  "really",
  "so",
  "super",
  "very",
  "extremely",
  "insanely",
  "too",
  "deeply",
  "seriously",
  "pretty",
];

export const DOWNPLAYERS = ["kinda", "kind of", "sorta", "sort of", "a bit", "meh", "whatever"];

export const NEGATIONS = [
  "not",
  "never",
  "no",
  "dont",
  "don't",
  "cant",
  "can't",
  "isn't",
  "isnt",
  "wasn't",
  "wasnt",
];

export const LOAD_SIGNALS = [
  "no time",
  "last minute",
  "deadline",
  "pressure",
  "too much",
  "meeting",
  "client",
  "boss",
  "overtime",
  "weekend",
  "back to back",
  "back-to-back",
  "all day",
  "nonstop",
  "on call",
  "on-call",
  "expected",
  "demand",
  "catch up",
  "behind",
  "overbooked",
  "on the hook",
];

export function normalize(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasPhrase(windowText: string, phrase: string): boolean {
  const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
  return re.test(windowText);
}

export function cleanSnippet(text: string, maxLen = 140): string {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

export function cleanSentence(text: string, maxLen = 220): string {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;

  const slice = t.slice(0, maxLen);
  const lastStop = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  if (lastStop >= 80) return slice.slice(0, lastStop + 1).trim();

  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace >= 80 ? slice.slice(0, lastSpace) : slice).trim() + "…";
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function countHits(t: string, phrases: string[]): number {
  let c = 0;
  for (const p of phrases) {
    if (hasPhrase(t, p)) c++;
  }
  return c;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shortDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function intensityBoost(window: string): number {
  if (INTENSIFIERS.some((x) => window.includes(x))) return 1.35;
  if (DOWNPLAYERS.some((x) => window.includes(x))) return 0.82;
  return 1.0;
}

export function negationFlip(window: string): boolean {
  return NEGATIONS.some((n) => window.includes(n));
}

export function looksRedundant(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;

  const aWords = unique(na.split(" ").filter((w) => w.length >= 4));
  if (aWords.length < 6) return false;

  let hits = 0;
  for (const w of aWords) {
    if (nb.includes(w)) hits++;
  }

  return hits >= Math.max(4, Math.floor(aWords.length * 0.55));
}

export function humanJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function splitSentences(text: string): string[] {
  const s = (text ?? "").trim();
  if (!s) return [];

  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;
    const isEnd = ch === "." || ch === "!" || ch === "?";
    const next = s[i + 1] ?? "";
    if (isEnd && (next === " " || next === "\n" || next === "\t" || next === "")) {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}
