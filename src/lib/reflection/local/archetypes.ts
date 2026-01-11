import type { ReflectionOutput } from "../types";
import { extractAnchor, pick, softEcho } from "../shared";

export function localUnwindDecompress(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 150);
  const mirror =
    [
      pick([
        "This reads like the kind of day that follows you home. Your body’s off work, but your mind isn’t.",
        "It sounds like you’re trying to come down from a high-pressure day and your thoughts are still running.",
        "That ‘colliding thoughts’ feeling is real. It’s hard to unwind when your brain won’t stop narrating.",
      ]),
      anchor ? `The part that stands out is: ${softEcho(anchor, 140)}.` : null,
      pick([
        "You don’t have to solve everything tonight. You just need a softer landing.",
        "Let’s aim for a small reset, not a perfect unwind.",
      ]),
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n");

  const question = pick([
    "If you could set down one thing for the next hour, what would it be?",
    "What would help you switch off by 10%: a plan for tomorrow, a boundary, or a small ritual?",
  ]);

  const nudges = pick([
    [
      "2-minute dump: write every thought as a bullet. No order. No fixing.",
      "Then circle one: ‘this can wait’ vs ‘this needs a tiny next step’.",
    ],
    [
      "Name 3 things: what happened / what you’re feeling / what you need tonight.",
      "If that’s too much: one word for your mood + one kind thing you’ll do next.",
    ],
  ]);

  return { mode: "local", mirror, question, nudges };
}

export function localPatternInsight(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 160);
  const mirror =
    [
      pick([
        "I hear you trying to understand the *pattern*, not just vent about the moment.",
        "This reads like you’re zooming out — like: ‘what is it about me / my life that keeps doing this?’",
      ]),
      anchor ? `What you’re pointing at is: ${softEcho(anchor, 150)}.` : null,
      pick([
        "That’s a strong move — noticing the loop is usually the first step to changing it.",
        "We can treat this like curiosity, not self-judgment.",
      ]),
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n");

  const question = pick([
    "When does this pattern show up most — after stress, after conflict, when you’re tired, or when you feel pressure?",
    "What do you think this pattern is trying to protect you from (even if it’s messy)?",
    "What’s the cost of the pattern — and what’s the tiny benefit that keeps it around?",
  ]);

  const nudges =
    Math.random() < 0.65
      ? pick([
          [
            "Three bullets: Trigger / Story your brain tells / What you do next.",
            "Then: one 5% experiment you could try next time.",
          ],
          [
            "Finish: ‘The moment I start to spiral is usually when…’",
            "Finish: ‘What I actually need in that moment is…’",
          ],
        ])
      : undefined;

  return { mode: "local", mirror, question, nudges };
}
