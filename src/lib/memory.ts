import type { JournalEntry } from "../types/journal";
import type { UserMemory } from "../types/memory";

const MEMORY_KEY = "solace_memory_v3";

const emptyMemory = (): UserMemory => ({
  coping: [],
  likes: [],
  people: [],
  hobbies: [],
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
  if (/\b(play(ing)?|practic(e|ing))\b.*\b(piano|guitar|drums|instrument)\b/.test(textLower) || /\b(piano|guitar|drums)\b.*\b(helps|calms|ease|eases|ground|grounding|relax)\b/.test(textLower)) {
    add("playing music");
  }
  if (/\bshower\b|\bbath\b/.test(textLower)) add("taking a shower/bath");
  if (/\bsleep\b|\bnap\b|\brest\b/.test(textLower)) add("resting/sleep");
  if (/\bbreath\b|\bbreathing\b|\bmeditat\b/.test(textLower)) add("breathing/meditation");
  if (/\b(read|reading|book|novel|chapter)\b/.test(textLower)) add("reading");
  if (/\b(talking to people|talking|talked|call|called|text|texted|face ?time|hang out|hung out|see people|with people)\b/.test(textLower)) {
    add("talking to someone");
  }
  if (/\b(coffee|espresso|latte|cappuccino|tea)\b/.test(textLower)) add("coffee/tea");

  return out;
}

function canonicalHobbies(textLower: string): string[] {
  const out: string[] = [];
  const add = (s: string) => out.push(s);

  if (/\b(read|reading|book|novel|chapter)\b/.test(textLower)) add("reading");
  if (/\b(game|gaming|video game|pc game|playstation|xbox|switch)\b/.test(textLower)) add("gaming");
  if (/\b(guitar|piano|drums|instrument|music|singing|kpop|playlist|song)\b/.test(textLower)) add("music");
  if (/\b(paint|painting|draw|drawing|sketch|art)\b/.test(textLower)) add("art");
  if (/\b(skating|ice skate|ice skating)\b/.test(textLower)) add("skating");
  if (/\b(figure skating)\b/.test(textLower)) add("skating");
  if (/\b(dance|dancing)\b/.test(textLower)) add("dance");
  if (/\b(swim|swimming)\b/.test(textLower)) add("swimming");
  if (/\b(cook|cooking|bake|baking|recipe)\b/.test(textLower)) add("cooking");
  if (/\b(clean|cleaning|tidy|organize|organizing|laundry|dishes)\b/.test(textLower)) add("resetting my space");
  if (/\b(photography|camera)\b/.test(textLower)) add("photography");
  if (/\b(tv|show|series|movie|anime|k-?drama|drama|action movie)\b/.test(textLower)) add("shows/movies");
  if (/\b(hike|hiking|trail|walk in the woods|forest|park|nature)\b/.test(textLower)) add("outdoors");
  if (/\b(beach|ocean|sea)\b/.test(textLower)) add("beach time");
  if (/\b(travel|trip|vacation|adventure|adventuring|explor(e|ing)\b|exploring the city)\b/.test(textLower)) add("exploring");
  if (/\b(pet|petting|dog|cat|animal|animals)\b/.test(textLower)) add("animals");
  if (/\b(pray|praying|prayer|church|service)\b/.test(textLower)) add("faith");
  if (/\b(journal|journaling|write|writing)\b/.test(textLower)) add("journaling");
  if (/\b(rest|resting|relax|relaxing|sleep|sleeping|nap|napping|doing nothing)\b/.test(textLower)) add("rest");
  if (/\b(see friends|hang out|spend time with friends|spending time with friends|spend time with family|spending time with family|kids)\b/.test(textLower)) add("time with people");

  return out;
}

function extractPeopleMentions(text: string): string[] {
  const t = text;
  const out: string[] = [];
  const add = (s: string) => out.push(s);

  // Roles (kept general + demo-safe)
  const roles = [
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
  ];
  for (const r of roles) {
    const re = new RegExp(`\\bmy\\s+${r}\\b`, "i");
    if (re.test(t)) add(r);
  }

  // Named people (only if explicitly introduced as a person)
  const m = t.match(/\b(?:my\s+friend|my\s+partner|my\s+girlfriend|my\s+boyfriend|my\s+roommate)\s+([A-Z][a-z]{1,20})\b/g);
  if (m) {
    for (const s of m) {
      const name = s.split(/\s+/).slice(-1)[0];
      if (name) add(name);
    }
  }

  return out;
}

export function extractMemoryFromText(text: string, prev: UserMemory): UserMemory {
  let mem = { ...prev };
  const raw = text.trim();
  if (!raw) return mem;

  // Guided sessions include prompt text; only learn from the user's answers.
  const firstLine = raw.split("\n")[0] ?? "";
  const isGuided = /^Guided Session\s*(?:—|-|:)/i.test(firstLine.trim());
  const t = isGuided
    ? raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .filter((l) => !/^Guided Session\s*(?:—|-|:)/i.test(l))
        .filter((l) => !/^\d+\.\s+/.test(l))
        .filter((l) => !/^One-line takeaway:/i.test(l))
        .join("\n")
    : raw;

  const lower = t.toLowerCase();

  // Coping: capture canonical items (so callbacks sound natural)
  for (const c of canonicalCoping(lower)) {
    mem.coping = uniqPush(mem.coping, c);
  }

  // Hobbies (broad + safe)
  for (const h of canonicalHobbies(lower)) {
    mem.hobbies = uniqPush(mem.hobbies, h);
  }

  // People in their life (roles + explicit names)
  for (const p of extractPeopleMentions(t)) {
    mem.people = uniqPush(mem.people, p);
  }

  // Likes
  const likeMatch = t.match(/(?:i enjoy|i like|i love)\s+(.*)/i);
  if (likeMatch?.[1]) mem.likes = uniqPush(mem.likes, likeMatch[1]);

  // Stressors
  const stressMatch =
    t.match(/(?:stressed|worried|anxious)\s+(?:about|because of)\s+(.*)/i) ||
    t.match(/(?:it stresses me out when)\s+(.*)/i);
  if (stressMatch?.[1]) mem.stressors = uniqPush(mem.stressors, stressMatch[1]);

  // Work-style stressors even if they didn't use the word "stressed"
  if (/\b(back[- ]?to[- ]?back|meetings? back to back|no time|time isn'?t mine|time isnt mine|deadline|on-call|overtime)\b/i.test(t)) {
    mem.stressors = uniqPush(mem.stressors, "work pressure / no breathing room");
  }

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
    if (!raw) return emptyMemory();
    const parsed = JSON.parse(raw) as Partial<UserMemory>;
    // Lightweight migration: fill missing fields from older versions.
    return {
      ...emptyMemory(),
      ...parsed,
      coping: Array.isArray(parsed.coping) ? parsed.coping : [],
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      hobbies: Array.isArray(parsed.hobbies) ? parsed.hobbies : [],
      stressors: Array.isArray(parsed.stressors) ? parsed.stressors : [],
      wins: Array.isArray(parsed.wins) ? parsed.wins : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
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
