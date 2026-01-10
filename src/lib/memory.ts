import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

const MEMORY_KEY = "solace_memory_v3";

const emptyMemory = (): UserMemory => ({
  coping: [],
  likes: [],
  stressors: [],
  wins: [],
  updatedAt: new Date().toISOString(),
});

function uniqPush(arr: string[], item: string, limit = 12) {
  const cleaned = item.trim().replace(/\s+/g, " ");
  if (!cleaned) return arr;
  if (arr.some((x) => x.toLowerCase() === cleaned.toLowerCase())) return arr;
  return [cleaned, ...arr].slice(0, limit);
}

function canonicalCoping(textLower: string): string[] {
  const out: string[] = [];
  const add = (s: string) => out.push(s);

  if (/\bwalk\b|\bwalked\b|\bgoing for a walk\b/.test(textLower)) add("going on walks");
  if (/\bgym\b|\bworkout\b|\brun\b|\byoga\b|\bexercise\b/.test(textLower)) add("getting some movement");
  if (/\bmusic\b|\bplaylist\b|\bsong\b/.test(textLower)) add("listening to music");
  if (/\bshower\b|\bbath\b/.test(textLower)) add("taking a shower/bath");
  if (/\bsleep\b|\bnap\b|\brest\b/.test(textLower)) add("resting/sleep");
  if (/\bbreath\b|\bbreathing\b|\bmeditat\b/.test(textLower)) add("breathing/meditation");

  return out;
}

export function extractMemoryFromText(text: string, prev: UserMemory): UserMemory {
  let mem = { ...prev };
  const t = text.trim();
  if (!t) return mem;

  const lower = t.toLowerCase();

  // Coping: capture canonical items (so callbacks sound natural)
  for (const c of canonicalCoping(lower)) {
    mem.coping = uniqPush(mem.coping, c);
  }

  // Likes
  const likeMatch = t.match(/(?:i enjoy|i like|i love)\s+(.*)/i);
  if (likeMatch?.[1]) mem.likes = uniqPush(mem.likes, likeMatch[1]);

  // Stressors
  const stressMatch =
    t.match(/(?:stressed|worried|anxious)\s+(?:about|because of)\s+(.*)/i) ||
    t.match(/(?:it stresses me out when)\s+(.*)/i);
  if (stressMatch?.[1]) mem.stressors = uniqPush(mem.stressors, stressMatch[1]);

  // Wins
  const winMatch =
    t.match(/(?:proud of|went well|small win|i managed to|i did)\s+(.*)/i);
  if (winMatch?.[1]) mem.wins = uniqPush(mem.wins, winMatch[1]);

  mem.updatedAt = new Date().toISOString();
  return mem;
}

export function loadMemory(): UserMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? (JSON.parse(raw) as UserMemory) : emptyMemory();
  } catch {
    return emptyMemory();
  }
}

export function saveMemory(mem: UserMemory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

export function buildMemoryFromEntries(entries: JournalEntry[]): UserMemory {
  let mem = emptyMemory();
  for (const e of entries.slice(0, 40)) {
    mem = extractMemoryFromText(e.text, mem);
  }
  return mem;
}
