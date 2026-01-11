import type { ReflectionOutput } from "../types";
import { pick } from "../shared";
import { detectDismissiveShutdown } from "../detect";
import { extractAnsweredDrainingPart } from "../memory";

export function localWorkStress(text: string, memLine: string | null): ReflectionOutput {
  const answered = extractAnsweredDrainingPart(text);
  const dismissive = detectDismissiveShutdown(text);

  const t = text.toLowerCase();
  const mentionsTimeNotYours = /\b(time (isn'?t|is not) mine|my time (isn'?t|is not) mine|personal time|after hours|staying late|late night)\b/.test(t);
  const mentionsNoSlack = /\b(back[- ]?to[- ]?back|no break|no breaks|no slack|packed|nonstop|all day)\b/.test(t);
  const mentionsFoodSkipped = /\b(didn'?t eat|did not eat|no lunch|skipped lunch|forgot to eat|ate at|didn'?t have time to eat)\b/.test(t);

  const mirror1 = pick([
    "Yeah… that sounds brutal. Not just busy, but the kind of day with no room to breathe.",
    "That’s a lot. When work expands into your personal time, it can start to feel like there’s no real off switch.",
    "I get why you’d feel like you’re putting too much into work. That reads like constant output with no refill.",
  ]);

  const mirror2 = answered
    ? "And you already named the draining part clearly. That kind of clarity matters."
    : dismissive
    ? pick([
        "That little shrug at the end feels like your brain trying to shut it down just to get through it.",
        "That ‘whatever’ energy reads like fatigue. Like you’re trying not to feel the whole thing at once.",
      ])
    : pick([
        mentionsTimeNotYours
          ? "Days like that can make it feel like your time belongs to everyone but you."
          : "Back-to-back days like that can make it feel like your time belongs to everyone but you.",
        mentionsFoodSkipped
          ? "Not getting a real chance to eat is a loud signal your day had zero slack in it."
          : "That pace is the kind where you’re doing everything ‘right’ and still end up depleted.",
        mentionsNoSlack ? "It makes sense your system is still on. You didn’t get a single exhale." : "",
      ]);

  // If they already answered “what’s most draining”, don’t ask it again—move forward.
  const question = answered
    ? pick([
        "What would a realistic boundary look like here, even a small one you could hold this week?",
        "If you could change one thing that protects your time, what’s the most doable change?",
      ])
    : pick([
        "What part of this is most draining: the schedule, the pressure, or the feeling that your time isn’t yours?",
        "If you could change one thing about your work week right now, what would give you the biggest relief?",
      ]);

  const nudges =
    Math.random() < 0.6
      ? pick([
          ["Name one boundary you wish you had today (time, scope, availability)."],
          ["Write one sentence: What I need more of is ___.", "And one: What I need less of is ___."],
          ["Quick check: what’s one small thing you can do tonight that belongs to you?"],
        ])
      : undefined;

  return {
    mode: "local",
    mirror: [mirror1, mirror2, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}
