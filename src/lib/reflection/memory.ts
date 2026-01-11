import type { UserMemory } from "../../types/memory";
import type { Tone, Topic } from "./types";
import { pick } from "./shared";

export function toKeywords(s: string): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => w.length >= 4)
    .slice(0, 20);
}

function overlapScore(needle: string, haystackLower: string): number {
  const keys = toKeywords(needle);
  if (!keys.length) return 0;
  let score = 0;
  for (const k of keys) {
    if (haystackLower.includes(k)) score += 1;
  }
  return score;
}

function pickBestMatch(items: string[], entryLower: string): string | null {
  let best: { s: string; score: number } | null = null;
  for (const s of items) {
    const score = overlapScore(s, entryLower);
    if (!best || score > best.score) best = { s, score };
  }
  if (!best) return null;
  // Require at least one meaningful overlap; otherwise it's likely irrelevant.
  if (best.score <= 0) return null;
  return best.s;
}

export function selectRelevantMemory(
  mem: UserMemory | undefined,
  entryText: string,
  tone: Tone,
  topic: Topic,
  intents?: { unwind?: boolean; pattern?: boolean }
): { coping?: string; like?: string; hobby?: string; person?: string; stressor?: string; win?: string } {
  if (!mem) return {};
  const entryLower = (entryText ?? "").toLowerCase();

  const coping = mem.coping.length ? pickBestMatch(mem.coping, entryLower) : null;
  const like = mem.likes.length ? pickBestMatch(mem.likes, entryLower) : null;
  const hobby = mem.hobbies.length ? pickBestMatch(mem.hobbies, entryLower) : null;
  const person = mem.people.length ? pickBestMatch(mem.people, entryLower) : null;
  const stressor = mem.stressors.length ? pickBestMatch(mem.stressors, entryLower) : null;
  const win = mem.wins.length ? pickBestMatch(mem.wins, entryLower) : null;

  const isRole = (p: string) =>
    [
      "mom",
      "dad",
      "mother",
      "father",
      "sister",
      "brother",
      "partner",
      "girlfriend",
      "boyfriend",
      "wife",
      "husband",
      "roommate",
      "coworker",
      "manager",
      "boss",
      "friend",
      "friends",
    ].includes(p.toLowerCase());

  // Topic-based nudges: allow relevant coping even without literal overlap
  // (e.g., work stress -> movement/breathing can still be relevant), but keep it conservative.
  const allowCopingByTopic =
    (topic === "work" || topic === "relationships" || topic === "anxiety_rumination" || topic === "mental_wellness") &&
    (tone === "negative" || tone === "mixed");

  // People and hobbies can be helpful, but keep them highly relevant.
  // - People: only surface when entry is relationship-focused (or direct overlap).
  // - Hobbies: only surface when the entry is about unwinding/decompressing (or direct overlap).
  const allowPersonByTopic = topic === "relationships";
  const allowHobbyByIntent = Boolean(intents?.unwind);

  const personFallback = allowPersonByTopic ? mem.people.find(isRole) ?? undefined : undefined;
  const hobbyFallback = allowHobbyByIntent ? mem.hobbies[0] : undefined;

  return {
    coping: coping ?? (allowCopingByTopic ? mem.coping[0] : undefined),
    like: tone === "positive" && topic !== "work" ? (like ?? undefined) : undefined,
    hobby: hobby ?? hobbyFallback,
    person: person ?? personFallback,
    stressor: tone !== "positive" ? (stressor ?? undefined) : undefined,
    win: tone === "positive" || topic === "wins_gratitude" ? (win ?? undefined) : undefined,
  };
}

export function maybeMemoryLine(mem: UserMemory | undefined, entryText: string, tone: Tone, topic: Topic): string | null {
  if (!mem) return null;

  const relevant = selectRelevantMemory(mem, entryText, tone, topic);
  const hasAnything = Boolean(relevant.coping || relevant.like || relevant.stressor || relevant.win);
  if (!hasAnything) return null;

  // subtle but demo-visible
  const show = Math.random() < 0.18;
  if (!show) return null;

  if ((tone === "negative" || tone === "mixed") && relevant.coping) {
    const c = relevant.coping;
    return pick([
      `Small thing I’m remembering: you’ve said **${c}** can help sometimes. Does that feel true today, or not really?`,
      `You’ve mentioned **${c}** helping before — not as a fix, just as a small reset.`,
    ]);
  }

  if (tone === "positive" && relevant.like && topic !== "work") {
    const l = relevant.like;
    return pick([
      `Tiny callback: you’ve mentioned you like **${l}** — small joys count.`,
      `This kind of reminds me of what you said about **${l}** — it fits this lighter moment.`,
    ]);
  }

  // Wins callbacks should not show up inside negative relationship/work entries.
  if (relevant.win && (tone === "positive" || topic === "wins_gratitude") && topic !== "relationships" && topic !== "work") {
    const w = relevant.win;
    return pick([
      `Small reminder: you’ve had wins like **${w}** — you’re building a pattern.`,
      `You’ve been stacking small wins (like **${w}**).`,
    ]);
  }

  if ((tone === "negative" || tone === "mixed" || tone === "neutral") && relevant.stressor) {
    const s = relevant.stressor;
    return pick([
      `Tiny callback: you’ve mentioned **${s}** being stressful before — does this feel connected?`,
      `This reminds me of when you said **${s}** was weighing on you. No need to force a link — just noticing.`,
    ]);
  }

  return null;
}

// Detect “I already answered the question” patterns
export function extractAnsweredDrainingPart(text: string): string | null {
  const t = text.toLowerCase();
  const m = t.match(/(the most draining.*?is|most draining.*?is|it'?s the).*?(\.|$)/);
  if (!m) return null;

  // grab a short slice of the original (not lowercased) for nicer echo
  const idx = t.indexOf(m[0]);
  if (idx === -1) return "that part about your time not feeling like yours";
  const originalSlice = text.slice(idx, Math.min(text.length, idx + 140)).trim();
  return originalSlice.length ? originalSlice : "that part about your time not feeling like yours";
}
