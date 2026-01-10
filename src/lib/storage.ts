import type { JournalEntry, Reflection } from "../types/journal";

const ENTRIES_KEY = "solace_entries_v1";
const REFLECTIONS_KEY = "solace_reflections_v1";

export function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadReflections(): Reflection[] {
  try {
    const raw = localStorage.getItem(REFLECTIONS_KEY);
    return raw ? (JSON.parse(raw) as Reflection[]) : [];
  } catch {
    return [];
  }
}

export function saveReflections(reflections: Reflection[]) {
  localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(reflections));
}
