export type JournalEntry = {
  id: string;
  createdAt: string; // ISO
  text: string;
};

export type ThemeTag = {
  id: string;
  label: string;
};

export type Reflection = {
  entryId: string;
  createdAt: string; // ISO
  mirror: string;
  // Optional for backward-compat with older saved reflections.
  question?: string;
  nudges?: string[];
  themes?: ThemeTag[];
  // Optional for backward-compat with older saved reflections.
  mode?: "local" | "enhanced";
};
