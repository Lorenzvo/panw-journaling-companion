import { describe, expect, it } from "vitest";

import { buildMoodTimeline } from "../src/lib/insights/mood";
import { scoreSentiment, sentimentLabel } from "../src/lib/insights/sentiment";
import { extractThemes } from "../src/lib/insights/themes";
import { whatHelped } from "../src/lib/insights/help";

// Minimal shape for tests; the insights logic only reads these fields.
function entry(text: string, createdAt: string) {
  return {
    id: "test",
    text,
    createdAt,
  } as const;
}

describe("insights/sentiment", () => {
  it("scores positive and negative text in the expected direction", () => {
    expect(scoreSentiment("I feel good and hopeful today")).toBeGreaterThan(0);
    expect(scoreSentiment("I feel bad and overwhelmed today")).toBeLessThan(0);
  });

  it("handles negation near sentiment words", () => {
    const pos = scoreSentiment("I feel good");
    const negated = scoreSentiment("I do not feel good");
    expect(negated).toBeLessThan(pos);
  });

  it("produces stable labels for boundaries", () => {
    expect(sentimentLabel(-3)).toBe("very_low");
    expect(sentimentLabel(0)).toBe("steady");
    expect(sentimentLabel(3)).toBe("very_good");
  });
});

describe("insights/mood", () => {
  it("ignores entries with invalid dates", () => {
    const timeline = buildMoodTimeline(
      [
        entry("good day", "not-a-date"),
        entry("bad day", new Date().toISOString()),
      ] as any,
      7
    );

    expect(timeline).toHaveLength(7);
    expect(timeline.every((p) => !p.dateKey.includes("NaN"))).toBe(true);
  });
});

describe("insights/themes", () => {
  it("extracts a work theme from work-heavy entries", () => {
    const now = new Date();
    const entries = [
      entry("Back to back meetings and a deadline. No time.", now.toISOString()),
      entry("Client pressure is stressing me out.", now.toISOString()),
    ] as any;

    const themes = extractThemes(entries, 6);
    expect(themes.some((t) => t.id === "work")).toBe(true);
  });
});

describe("insights/help", () => {
  it("surfaces coffee/tea as a warm-drink stabilizer", () => {
    const memory = { coping: ["coffee/tea"], hobbies: [], likes: [] } as any;
    const timeline = [{ dateKey: "2020-01-01", day: "Wed", avg: -2, label: "very_low", count: 1 }] as any;
    const items = whatHelped(memory, timeline);
    expect(items.some((i) => i.label.toLowerCase().includes("warm drink"))).toBe(true);
  });
});
