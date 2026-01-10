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

export function normalize(text: string) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasPhrase(windowText: string, phrase: string) {
  const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
  return re.test(windowText);
}

export function cleanSnippet(text: string, maxLen = 140) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

export function cleanSentence(text: string, maxLen = 220) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;

  const slice = t.slice(0, maxLen);
  const lastStop = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  if (lastStop >= 80) return slice.slice(0, lastStop + 1).trim();

  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace >= 80 ? slice.slice(0, lastSpace) : slice).trim() + "…";
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function countHits(t: string, phrases: string[]) {
  let c = 0;
  for (const p of phrases) {
    if (hasPhrase(t, p)) c++;
  }
  return c;
}

export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function shortDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function intensityBoost(window: string) {
  if (INTENSIFIERS.some((x) => window.includes(x))) return 1.35;
  if (DOWNPLAYERS.some((x) => window.includes(x))) return 0.82;
  return 1.0;
}

export function negationFlip(window: string) {
  return NEGATIONS.some((n) => window.includes(n));
}

export function looksRedundant(a: string, b: string) {
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
