import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

const MEMORY_KEY = "solace_memory_v1";

const emptyMemory = (): UserMemory => ({
  coping: [],
  likes: [],
  stressors: [],
  wins: [],
  updatedAt: new Date().toISOString(),
});

function uniqPush(arr: string[], item: string) {
  const cleaned = item.trim();
  if (!cleaned) return arr;
  if (arr.some((x) => x.toLowerCase() === cleaned.toLowerCase())) return arr;
  return [cleaned, ...arr].slice(0, 12);
}

// Very lightweight extraction: good enough for MVP, explainable in a design doc.
export function extractMemoryFromText(text: string, prev: UserMemory): UserMemory {
  const t = text.toLowerCase();
  let mem = { ...prev };

  // coping: "helped me", "calmed me", "made me feel better", "wind down"
  const copingPatterns = [
    /(?:helped|helps|calmed|calms|makes me feel better|grounded me|winds me down)\s+(?:when|because)?\s*(.*)/i,
    /(?:i wind down by|to wind down i|when i feel stressed i)\s*(.*)/i,
  ];

  for (const re of copingPatterns) {
    const m = text.match(re);
    if (m?.[1]) mem.coping = uniqPush(mem.coping, m[1]);
  }

  // likes: "i enjoy", "i like", "i love"
  const likeMatch = text.match(/(?:i enjoy|i like|i love)\s+(.*)/i);
  if (likeMatch?.[1]) mem.likes = uniqPush(mem.likes, likeMatch[1]);

  // stressors: "stressed about", "worried about", "anxious about"
  const stressMatch = text.match(/(?:stressed|worried|anxious)\s+(?:about|because of)\s+(.*)/i);
  if (stressMatch?.[1]) mem.stressors = uniqPush(mem.stressors, stressMatch[1]);

  // wins: "proud of", "went well", "small win"
  const winMatch =
    text.match(/(?:proud of|went well|small win|i managed to)\s+(.*)/i);
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

// Optionally build memory from recent entries (for first run)
export function buildMemoryFromEntries(entries: JournalEntry[]): UserMemory {
  let mem = emptyMemory();
  for (const e of entries.slice(0, 25)) {
    mem = extractMemoryFromText(e.text, mem);
  }
  return mem;
}
