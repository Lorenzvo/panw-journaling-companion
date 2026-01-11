const SAFETY_NOTE =
  "If you’re feeling like you might hurt yourself, you deserve real-time support. If you’re in the U.S., you can call or text **988**. If you’re elsewhere, I can help find local resources. If you’re in immediate danger, call your local emergency number.";

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function normalize(text: string) {
  return (text ?? "").trim().replace(/\s+/g, " ");
}

export function splitSentences(text: string): string[] {
  const raw = (text ?? "").replace(/\n+/g, " ").trim();
  if (!raw) return [];
  // Avoid regex lookbehind for wider browser support.
  const matches = raw.match(/[^.!?]+(?:[.!?]+\s*|$)/g);
  return (matches ?? [raw]).map((s) => s.trim()).filter(Boolean);
}

export function snippet(text: string, max = 140) {
  const t = normalize(text);
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

export function extractAnchor(text: string, max = 140): string {
  const t = normalize(text);
  if (!t) return "";

  const sentences = splitSentences(t);
  const candidates = sentences.length ? sentences : [t];

  // Prefer “because/but/so/then” sentences—they often carry the meaning.
  const preferred = candidates.find((s) => /\b(because|but|so|then|and)\b/i.test(s)) ?? candidates[0];
  return snippet(preferred, max);
}

export function removeLeadingLabels(s: string) {
  return normalize(s)
    .replace(/^small\s*win\s*:\s*/i, "")
    .replace(/^win\s*:\s*/i, "")
    .replace(/^gratitude\s*:\s*/i, "")
    .replace(/^today\s*was\s*/i, "")
    .trim();
}

export function softEcho(text: string, max = 130): string {
  // A “paraphrase-ish” echo: we keep 1 concrete detail, but avoid quoting the user verbatim.
  const raw = removeLeadingLabels(text);
  if (!raw) return "";
  const s = extractAnchor(raw, max);
  // Avoid returning the exact same casing/punctuation as the user wrote.
  const cleaned = normalize(s)
    .replace(/[“”"]/g, "")
    .replace(/\s*\.+\s*$/, "")
    .trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function extractNamedHobbyDetail(text: string): { hobby?: string; detail?: string } {
  const t = text.toLowerCase();
  const hobby = /\bpiano\b/.test(t)
    ? "piano"
    : /\bguitar\b/.test(t)
    ? "guitar"
    : /\bdrums\b/.test(t)
    ? "drums"
    : /\b(skating|ice skating|figure skating)\b/.test(t)
    ? "skating"
    : /\b(dance|dancing)\b/.test(t)
    ? "dance"
    : /\b(swim|swimming)\b/.test(t)
    ? "swimming"
    : /\b(read|reading)\b/.test(t)
    ? "reading"
    : /\b(anime|movie|show|series|k-?drama)\b/.test(t)
    ? "a familiar watch"
    : /\b(game|gaming)\b/.test(t)
    ? "gaming"
    : undefined;

  // Composer / specific “flavor” details if present.
  const detail = /\bchopin\b/i.test(text)
    ? "Chopin"
    : /\b(debussy|mozart|beethoven|bach|rachmaninoff)\b/i.test(text)
    ? (text.match(/\b(debussy|mozart|beethoven|bach|rachmaninoff)\b/i)?.[1] ?? undefined)
    : undefined;

  return { hobby, detail };
}

export function looksLikeGibberish(text: string) {
  const t = normalize(text);
  if (!t) return true;
  if (t.length <= 2) return true;

  const letters = (t.match(/[a-z]/gi) ?? []).length;
  if (letters === 0) return true;

  // Super low vowel ratio is a decent keysmash signal for longer strings.
  const vowels = (t.match(/[aeiou]/gi) ?? []).length;
  if (letters >= 8 && vowels / Math.max(1, letters) < 0.18) return true;

  const ratio = letters / Math.max(1, t.length);

  const words = t.split(" ").filter(Boolean);
  if (t.length < 8 && words.length <= 1) return true;
  if (ratio < 0.45 && t.length < 18) return true;

  return false;
}

export function looksLikeSelfHarm(text: string) {
  const t = text.toLowerCase();
  return /(suicid|kill myself|end my life|end it|self[- ]?harm|hurt myself|i want to die|want to die)/.test(t);
}

export function ensureSafetyNote(mirror: string, text: string) {
  if (!looksLikeSelfHarm(text)) return mirror;
  if (/\b988\b/.test(mirror)) return mirror;
  return [mirror, SAFETY_NOTE].filter(Boolean).join("\n\n");
}
