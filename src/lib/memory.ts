import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

const MEMORY_KEY = "solace_memory_v2";

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

function extractCopingStatements(text: string) {
  const lines: string[] = [];
  const patterns = [
    /(?:taking|going for|went on|a)\s+(a\s+)?walk\b.*?(?:helped|calmed|felt nice|felt better)/i,
    /\b(?:walk|music|gym|workout|run|shower|bath|sleep|nap|breathing|meditat)\w*\b.*?(?:helped|calmed|grounded|felt better|made me feel)/i,
    /(?:helps|helped|calmed|calms|grounds|grounded|made me feel better)\s+(?:me\s+)?(?:when|because)?\s*(.*)/i,
    /(?:i wind down by|to wind down i|when i feel stressed i)\s*(.*)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[0]) lines.push(m[0]);
    else if (m?.[1]) lines.push(m[1]);
  }
  return lines;
}

export function extractMemoryFromText(text: string, prev: UserMemory): UserMemory {
  let mem = { ...prev };
  const t = text.trim();
  if (!t) return mem;

  // Coping
  for (const c of extractCopingStatements(t)) {
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
  for (const e of entries.slice(0, 30)) {
    mem = extractMemoryFromText(e.text, mem);
  }
  return mem;
}
