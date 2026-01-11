import type { JournalEntry, Reflection } from "../types/journal";

const ENTRIES_KEY = "solace_entries_v1";
const REFLECTIONS_KEY = "solace_reflections_v1";

function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadEntries(): JournalEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: JournalEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadReflections(): Reflection[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(REFLECTIONS_KEY);
    return raw ? (JSON.parse(raw) as Reflection[]) : [];
  } catch {
    return [];
  }
}

export function saveReflections(reflections: Reflection[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(REFLECTIONS_KEY, JSON.stringify(reflections));
}
