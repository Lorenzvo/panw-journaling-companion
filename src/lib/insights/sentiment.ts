import {
  POSITIVE,
  NEGATIVE,
  LOAD_SIGNALS,
  normalize,
  hasPhrase,
  clamp,
  negationFlip,
  intensityBoost,
} from "./shared";

// Expanded labels let the UI feel specific without implying certainty.
export type SentimentLabel = "very_low" | "low" | "mixed" | "steady" | "good" | "very_good";

function titleCaseLabel(label: SentimentLabel) {
  switch (label) {
    case "very_low":
      return "very low";
    case "very_good":
      return "very good";
    default:
      return label;
  }
}

export function sentimentLabelTitle(label: SentimentLabel) {
  return titleCaseLabel(label);
}

/**
 * Heuristic sentiment scoring:
 * - negations flip nearby polarity
 * - intensifiers adjust weight
 * - “load” penalty captures time-pressure entries even without explicit negative words
 */
export function scoreSentiment(text: string) {
  const t = normalize(text);
  if (!t) return 0;

  const tokens = t.split(" ");
  let score = 0;

  for (let i = 0; i < tokens.length; i++) {
    const window = tokens.slice(Math.max(0, i - 2), Math.min(tokens.length, i + 3)).join(" ");

    const posHit = POSITIVE.find((w) => hasPhrase(window, w));
    const negHit = NEGATIVE.find((w) => hasPhrase(window, w));

    const boost = intensityBoost(window);

    if (posHit) {
      const flipped = negationFlip(window);
      score += (flipped ? -1 : 1) * 1.0 * boost;
    }
    if (negHit) {
      const flipped = negationFlip(window);
      score += (flipped ? 1 : -1) * 1.05 * boost;
    }
  }

  const loadCount = LOAD_SIGNALS.reduce((acc, s) => (t.includes(s) ? acc + 1 : acc), 0);
  if (loadCount >= 2 && score > -2) score -= 0.9;
  if (loadCount >= 4 && score > -2.5) score -= 0.6;

  return clamp(score, -3, 3);
}

export function sentimentLabel(avg: number): SentimentLabel {
  if (avg <= -2.0) return "very_low";
  if (avg <= -0.9) return "low";
  if (avg >= 2.0) return "very_good";
  if (avg >= 0.9) return "good";
  if (avg > -0.18 && avg < 0.18) return "steady";
  return "mixed";
}

export function sentimentEmoji(label: SentimentLabel) {
  switch (label) {
    case "very_low":
      return "😞";
    case "low":
      return "😔";
    case "mixed":
      return "😶";
    case "steady":
      return "😌";
    case "good":
      return "🙂";
    case "very_good":
      return "😄";
  }
}
