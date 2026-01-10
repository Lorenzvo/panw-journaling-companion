import type { SentimentLabel } from "./sentiment";

export type DayPoint = {
  dateKey: string; // YYYY-MM-DD
  day: string; // Sun/Mon/Tue...
  avg: number; // -3..+3
  label: SentimentLabel;
  count: number;
};

// Back-compat: some UI code still imports MoodPoint.
export type MoodPoint = DayPoint;
