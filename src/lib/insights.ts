// src/lib/insights.ts
import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

/**
 * Local-only Insights
 * - No network calls
 * - No LLM
 * - Demo-friendly + privacy-first
 */

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

const NEGATIVE = [
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

const INTENSIFIERS = [
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

// Downplayers are more about dampening intensity than polarity.
const DOWNPLAYERS = ["kinda", "kind of", "sorta", "sort of", "a bit", "meh", "whatever"];

const NEGATIONS = ["not", "never", "no", "dont", "don't", "cant", "can't", "isn't", "isnt", "wasn't", "wasnt"];

export type SentimentLabel = "low" | "mixed" | "steady" | "good";

export type DayPoint = {
  dateKey: string;     // YYYY-MM-DD
  day: string;         // Sun/Mon/Tue...
  avg: number;         // -3..+3
  label: SentimentLabel;
  count: number;
};

// Back-compat: some UI code still imports MoodPoint.
export type MoodPoint = DayPoint;

export type Theme = {
  id: string;
  label: string;
  score: number;
  examples: string[]; // short snippets
  summary: string;    // 1–2 sentence explanation
};

function normalize(text: string) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(windowText: string, phrase: string) {
  // Use boundaries to avoid false hits (e.g., "ok" inside "smoke").
  const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
  return re.test(windowText);
}

function cleanSnippet(text: string, maxLen = 140) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function negationFlip(window: string) {
  return NEGATIONS.some((n) => window.includes(n));
}

function intensityBoost(window: string) {
  if (INTENSIFIERS.some((x) => window.includes(x))) return 1.35;
  if (DOWNPLAYERS.some((x) => window.includes(x))) return 0.82;
  return 1.0;
}

/**
 * More detailed scoring than simple word count:
 * - negations flip the nearby polarity
 * - intensifiers increase weight
 * - “load” penalty if entry reads high-pressure even without explicit neg words
 */
export function scoreSentiment(text: string) {
  const t = normalize(text);
  if (!t) return 0;

  // sliding windows to catch “not good”, “so stressed”, etc.
  const tokens = t.split(" ");
  let score = 0;

  for (let i = 0; i < tokens.length; i++) {
    const window = tokens.slice(Math.max(0, i - 2), Math.min(tokens.length, i + 3)).join(" ");

    // Check hits with word boundaries (helps avoid accidental substring matches).
    const posHit = POSITIVE.find((w) => hasPhrase(window, w));
    const negHit = NEGATIVE.find((w) => hasPhrase(window, w));

    const boost = intensityBoost(window);

    if (posHit) {
      const flipped = negationFlip(window);
      score += (flipped ? -1 : 1) * 1.0 * boost;
    }
    if (negHit) {
      const flipped = negationFlip(window);
      score += (flipped ? 1 : -1) * 1.05 * boost;
    }
  }

  // Extra “load” signals that often mean strain even without explicit emotion words.
  const loadSignals = [
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
  ];
  const loadCount = loadSignals.reduce((acc, s) => (t.includes(s) ? acc + 1 : acc), 0);
  if (loadCount >= 2 && score > -2) score -= 0.9;
  if (loadCount >= 4 && score > -2.5) score -= 0.6;

  return clamp(score, -3, 3);
}

export function sentimentLabel(avg: number): SentimentLabel {
  if (avg <= -1.05) return "low";
  if (avg >= 1.0) return "good";
  // steady band should be narrow so we don’t call everything “steady”.
  if (avg > -0.22 && avg < 0.22) return "steady";
  return "mixed";
}

export function sentimentEmoji(label: SentimentLabel) {
  switch (label) {
    case "low":
      return "😔";
    case "mixed":
      return "😶";
    case "steady":
      return "😌";
    case "good":
      return "🙂";
  }
}

export function buildMoodTimeline(entries: JournalEntry[], days = 14): DayPoint[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { sum: number; n: number }>();

  for (const e of entries) {
    const d = new Date(e.createdAt);
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
    const avg = cur ? cur.sum / Math.max(1, cur.n) : (out.length ? out[out.length - 1].avg * 0.92 : 0);
    const clamped = clamp(avg, -3, 3);

    out.push({
      dateKey: k,
      day: shortDay(d),
      avg: clamped,
      label: sentimentLabel(clamped),
      count: cur?.n ?? 0,
    });
  }

  return out;
}

/**
 * Theme buckets: more meaningful than raw word frequency.
 * Also avoid false matches (e.g., “business call” shouldn’t trigger relationship “call”).
 */
type Bucket = {
  id: string;
  label: string;
  patterns: RegExp[];
  // helps pick best example by scoring matches
  score: (t: string) => number;
  describe: (t: string) => string; // personalized fragment based on sample text
};

function countMatches(t: string, patterns: RegExp[]) {
  let c = 0;
  for (const p of patterns) if (p.test(t)) c++;
  return c;
}

const BUCKETS: Bucket[] = [
  {
    id: "work",
    label: "Work pressure & time",
    patterns: [
      /\bwork\b/i, /\bboss\b/i, /\bmeeting\b/i, /\bclient\b/i, /\bdeadline\b/i,
      /\bovertime\b/i, /\bweekend\b/i, /\blast minute\b/i, /\bno time\b/i, /\bpressure\b/i
    ],
    score: (t) => countMatches(t, [/\bwork\b/i, /\bboss\b/i, /\bmeeting\b/i, /\bclient\b/i, /\bdeadline\b/i, /\bno time\b/i, /\bpressure\b/i, /\bovertime\b/i]),
    describe: (t) => {
      if (t.includes("no time") || t.includes("time isnt mine") || t.includes("time isn't mine")) {
        return "It isn’t just tasks — it’s the feeling that your time belongs to work right now.";
      }
      if (t.includes("last minute")) return "Last-minute changes show up as a real stress amplifier for you.";
      return "Work shows up here as load + expectations, not just a schedule.";
    },
  },
  {
    id: "relationships",
    label: "Relationships & connection",
    patterns: [
      /\bfriend(s)?\b/i, /\bpartner\b/i, /\brelationship\b/i, /\bfamily\b/i,
      /\bmom\b|\bdad\b|\bsister\b|\bbrother\b/i, /\bhang out\b/i,
      // “call/text” only if NOT obviously work-related
      /\bcall\b/i, /\btext\b/i,
    ],
    score: (t) => {
      const isWorkCall = /client call|business call|work call/.test(t);
      let s = 0;
      if (/\bfriend(s)?\b/.test(t)) s += 2;
      if (/\bfamily\b|\bmom\b|\bdad\b|\bsister\b|\bbrother\b/.test(t)) s += 2;
      if (/\bpartner\b|\brelationship\b/.test(t)) s += 2;
      if (/\bhang out\b/.test(t)) s += 1.5;
      if ((/\bcall\b/.test(t) || /\btext\b/.test(t)) && !isWorkCall) s += 1;
      return s;
    },
    describe: (t) => {
      if (t.includes("avoid") || t.includes("ignore")) return "There’s a push-pull here: wanting connection, but also wanting distance.";
      if (t.includes("hang out") || t.includes("caught up")) return "Connection reads as a real reset in your week, not just a social detail.";
      return "People are showing up as an emotional variable — energizing sometimes, complicated other times.";
    },
  },
  {
    id: "selfcare",
    label: "Self-care & grounding",
    patterns: [
      /\bwalk\b/i, /\bgym\b/i, /\bworkout\b/i, /\bexercise\b/i, /\bstretch\b/i,
      /\bmeditat/i, /\bbreathe\b/i, /\bshower\b|\bbath\b/i, /\bmusic\b/i,
      /\boutside\b|\bnature\b/i,
    ],
    score: (t) => countMatches(t, [/\bwalk\b/i, /\bexercise\b/i, /\bgym\b/i, /\bmeditat/i, /\bmusic\b/i, /\boutside\b/i]),
    describe: (t) => {
      if (t.includes("didnt exercise") || t.includes("didn't exercise")) return "When things pile up, self-care seems to be the first thing that drops.";
      if (t.includes("walk")) return "Movement shows up as a stabilizer you naturally reach for.";
      return "These are your “small resets” — the things that change how the next hour feels.";
    },
  },
  {
    id: "sleep",
    label: "Sleep & energy",
    patterns: [/\bsleep\b/i, /\binsomnia\b/i, /\btired\b/i, /\bexhaust/i, /\brest\b/i, /\benergy\b/i],
    score: (t) => countMatches(t, [/\bsleep\b/i, /\btired\b/i, /\bexhaust/i]),
    describe: (_t) => "Energy and recovery show up as a real limiter. When this theme spikes, everything else gets harder.",
  },
  {
    id: "finances",
    label: "Money & stability",
    patterns: [/\bfinance\b/i, /\bmoney\b/i, /\brent\b/i, /\bdebt\b/i, /\bbills\b/i, /\bpay\b/i],
    score: (t) => countMatches(t, [/\bfinance\b/i, /\bmoney\b/i, /\brent\b/i, /\bdebt\b/i, /\bbills\b/i]),
    describe: (_t) => "This reads less like math and more like safety. Money stress tends to spill into mood and motivation.",
  },
  {
    id: "selfworth",
    label: "Self-talk & confidence",
    patterns: [/\bnot good enough\b/i, /\bhate myself\b/i, /\bworthless\b/i, /\bfailure\b/i, /\bshame\b/i, /\bguilt\b/i],
    score: (t) => countMatches(t, [/\bnot good enough\b/i, /\bfailure\b/i, /\bshame\b/i, /\bguilt\b/i]),
    describe: (_t) => "This theme shows up when your inner voice gets sharp. Noticing it is the first step to changing it.",
  },
];

export function extractThemes(entries: JournalEntry[], topK = 6): Theme[] {
  // assume entries are stored newest-first; if not, this still works “recent enough”
  const recent = entries.slice(0, 35);
  if (!recent.length) return [];

  const scored = BUCKETS.map((b) => {
    let total = 0;
    const matches: { t: string; raw: string; s: number }[] = [];

    for (const e of recent) {
      const t = normalize(e.text);
      // special-case: avoid relationships “call/text” matching work calls
      if (b.id === "relationships" && /client call|business call|work call/.test(t)) {
        // still allow relationship if friend/family/etc exist
        if (!(/\bfriend|family|partner|relationship|hang out\b/.test(t))) continue;
      }

      const s = b.score(t);
      if (s > 0) {
        total += 1;
        matches.push({ t, raw: e.text, s });
      }
    }

    // pick best examples by highest match score, not by earliest entry
    matches.sort((a, c) => c.s - a.s);

    const examples = matches.slice(0, 2).map((m) => cleanSnippet(m.raw));
    const personalized = matches[0]?.t ? b.describe(matches[0].t) : "";
    const summaryBase =
      b.id === "relationships"
        ? "Connection keeps showing up as something that affects your emotional temperature."
        : b.id === "work"
        ? "Work shows up as pressure + time, not just events."
        : b.id === "selfcare"
        ? "Small stabilizers matter more than they get credit for."
        : b.id === "sleep"
        ? "When rest is off, everything feels louder."
        : b.id === "finances"
        ? "Money stress shows up as emotional load, not just numbers."
        : "Your inner voice has been a theme — both harshness and resilience.";

    // Summary is intentionally 2 lines: general + recent connection.
    const summary = personalized ? `${summaryBase}\n${personalized}` : summaryBase;

    return { bucket: b, total, examples, summary };
  })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, topK);

  return scored.map((x) => ({
    id: x.bucket.id,
    label: x.bucket.label,
    score: x.total,
    examples: x.examples,
    summary: x.summary,
  }));
}

export type HelpItem = { label: string; detail: string };

function canonicalHelp(label: string) {
  const t = label.toLowerCase();
  if (/(walk|walking|movement|move|exercise|run|gym|workout|stretch)/.test(t)) return "Movement";
  if (/(music|song|playlist)/.test(t)) return "Music";
  if (/(sleep|rest|nap)/.test(t)) return "Rest";
  if (/(friend|friends|family|hang out|talk|call|text)/.test(t)) return "Connection";
  if (/(write|journal|reflect)/.test(t)) return "Writing it out";
  return label;
}

export function whatHelped(memory: UserMemory, timeline: DayPoint[]): HelpItem[] {
  const raw = (memory.coping ?? []).slice(0, 10);
  const canon = new Map<string, number>();

  for (const r of raw) {
    const c = canonicalHelp(r);
    canon.set(c, (canon.get(c) ?? 0) + 1);
  }

  const ranked = Array.from(canon.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const items: HelpItem[] = ranked.map(([label]) => {
    switch (label) {
      case "Movement":
        return { label: "Movement & reset", detail: "This tends to help you come back to yourself, especially when your head feels loud." };
      case "Music":
        return { label: "Music", detail: "A quick way to change the texture of the moment without needing to solve anything." };
      case "Rest":
        return { label: "Rest & recovery", detail: "When energy is low, recovery usually helps more than pushing harder." };
      case "Connection":
        return { label: "Connection", detail: "When it’s available, people can soften the edge of a hard day." };
      case "Writing it out":
        return { label: "Writing it out", detail: "Getting it out of your head seems to reduce the pressure a bit." };
      default:
        return { label, detail: "This has shown up as something you reach for when you need steadiness." };
    }
  });

  // small trend hint (optional, no “grouped…” copy)
  const last = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];
  const trend = last && prev ? last.avg - prev.avg : 0;

  if (trend < -0.9 && items.length < 4) {
    items.push({ label: "One gentle thing", detail: "On heavier days, choosing one small stabilizer can lower the volume (not fix everything)." });
  }

  return items;
}

export type WeeklySummary = {
  headline: string;
  sentencePrefix: string;
  theme: string;
  toneLabel: SentimentLabel;
  sentenceSuffix: string;
  bullets: string[];
};

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

  const avg =
    last7.length === 0 ? 0 : last7.reduce((sum, e) => sum + scoreSentiment(e.text), 0) / last7.length;

  const toneLabel = sentimentLabel(avg);
  const topTheme = themes[0]?.label ?? "Your days";
  const h = hashString(`${topTheme}-${toneLabel}-${last7.length}`);

  const headlineOptions: Record<SentimentLabel, string[]> = {
    low: ["A heavier stretch, but you showed up", "A tough week and you still wrote", "You kept going even when it was a lot"],
    mixed: ["A mixed week with edges and bright spots", "Ups and downs, but real momentum", "A week that felt varied and honest"],
    steady: ["Quiet consistency", "A steadier week", "A calm, realistic pace"],
    good: ["More lightness showing up", "A week with some wins", "A week that gave you something back"],
  };

  const headline = headlineOptions[toneLabel][h % headlineOptions[toneLabel].length];

  const daysWithWriting = new Set(last7.map((e) => dayKey(new Date(e.createdAt)))).size;

  const bullets: string[] = [];
  bullets.push(`You wrote on ${daysWithWriting} day(s). That’s enough data to start noticing patterns.`);
  if (themes[1]) bullets.push(`A second thread that kept showing up: ${themes[1].label}.`);
  bullets.push(
    toneLabel === "steady"
      ? "Your mood trend looks relatively stable. Stable can be a win."
      : toneLabel === "good"
      ? "A few moments read clearly lighter. It’s worth noticing what made those days easier."
      : toneLabel === "low"
      ? "The tone has been heavier at points. The useful question is what tends to trigger it and what softens it."
      : "The tone has some variation. That’s normal. Patterns tend to sharpen as you keep writing."
  );

  return {
    headline,
    sentencePrefix: "A lot of your week touched",
    theme: topTheme,
    toneLabel,
    sentenceSuffix: daysWithWriting <= 1 ? "Even one honest entry counts." : "Consistency matters more than perfection.",
    bullets: bullets.slice(0, 3),
  };
}
