export type ReflectionOutput = {
  mirror: string;
  question?: string;
  nudges?: string[];
  mode: "local" | "enhanced";
};

export type Tone = "positive" | "negative" | "mixed" | "neutral";

export type Topic =
  | "work"
  | "new_to_journaling"
  | "mental_wellness"
  | "relationships"
  | "self_worth"
  | "finances"
  | "decisions"
  | "anxiety_rumination"
  | "wins_gratitude"
  | "food"
  | "school"
  | "health"
  | "general";

export type GuidedSessionQA = { q: string; a: string };

export type ParsedGuidedSession = {
  modeTitle: string;
  qa: GuidedSessionQA[];
  takeaway?: string;
};
