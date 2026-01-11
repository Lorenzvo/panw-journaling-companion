import type { ParsedGuidedSession, ReflectionOutput } from "../types";
import { normalize, pick, softEcho } from "../shared";
import { localWins } from "./wins";

export function localGuidedSession(guided: ParsedGuidedSession, memLine: string | null): ReflectionOutput {
  const mode = guided.modeTitle.toLowerCase().trim();
  const a1 = guided.qa[0]?.a?.trim() ?? "";
  const a2 = guided.qa[1]?.a?.trim() ?? "";
  const a3 = guided.qa[2]?.a?.trim() ?? "";
  const a4 = guided.qa[3]?.a?.trim() ?? "";

  const answers = [a1, a2, a3, a4].filter(Boolean);

  const allowedShort = new Set([
    "ok",
    "okay",
    "fine",
    "good",
    "great",
    "meh",
    "tired",
    "exhausted",
    "sad",
    "happy",
    "anxious",
    "stressed",
    "calm",
    "busy",
    "neutral",
  ]);

  function looksLikePlaceholderAnswer(a: string) {
    const n = normalize(a);
    const lower = n.toLowerCase();
    if (!n) return true;

    // single-letter / tiny fragments
    if (n.length <= 2 && !allowedShort.has(lower)) return true;

    // repeated-char placeholder (aaaa, ....)
    if (/^(.)\1{2,}$/.test(lower)) return true;

    // common non-answers
    if (/^(idk|n\/?a|na|none|nothing|whatever|\?+)$/.test(lower)) return true;

    // keysmash-ish
    const letters = (lower.match(/[a-z]/g) ?? []).length;
    const vowels = (lower.match(/[aeiou]/g) ?? []).length;
    if (letters >= 10 && vowels / Math.max(1, letters) < 0.15) return true;

    return false;
  }

  const meaningful = answers.filter((a) => !looksLikePlaceholderAnswer(a));

  // If the user basically entered placeholders ("a", keysmash, etc.), ask for one more sentence
  // instead of generating a confident reflection.
  if (answers.length > 0 && meaningful.length === 0) {
    const mirror = pick([
      "I’m here — I only got tiny fragments (like a placeholder), so I can’t reflect back much yet.",
      "I caught the structure of the session, but the answers look like placeholders — want to add one real sentence?",
    ]);

    const question = pick([
      "Which prompt is easiest to answer with one honest sentence?",
      "Want to expand just one answer — the one that feels most real right now?",
    ]);

    const nudges = pick([
      [
        "Unwind: “What’s still buzzing is…”",
        "Helped: “One thing that helped was…”",
        "Let go: “Tonight I’m letting go of…”",
        "Next hour: “One kind thing I’ll do is…”",
      ],
      [
      "If you’re tired: I’m exhausted because ___.",
      "If you’re blank: The main thing on my mind is ___.",
      ],
    ]);

    return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
  }

  // Keep it warm + specific, without over-claiming.
  if (mode === "small win") {
    return localWins(
      [
        guided.qa.map((x, i) => `${i + 1}. ${x.q}\n${x.a}`).join("\n\n"),
        guided.takeaway ? `One-line takeaway:\n${guided.takeaway}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      memLine
    );
  }

  if (mode === "unwind") {
    const mirror =
      [
        pick([
          "This reads like a tired day — the kind where your body’s asking for a softer landing.",
          "I hear low energy here. You’re not being lazy — you’re depleted.",
        ]),
        a1 ? `What’s still buzzing is basically: ${softEcho(a1, 110)}.` : null,
        a2
          ? pick([
              `And you did reach for a few real stabilizers. Those count, especially on tired days. (${softEcho(a2, 120)})`,
              `What helped wasn’t abstract. It was concrete. That’s useful information. (${softEcho(a2, 120)})`,
            ])
          : null,
        a3
          ? pick([
              `Letting go of ${softEcho(a3, 90).toLowerCase()} tonight is a boundary, even if it’s a small one.`,
              `You’re trying to set work down for the night. That’s a skill, not a switch.`,
            ])
          : null,
        a4
          ? pick([
              `For the next hour, ${softEcho(a4, 90).toLowerCase()} sounds like exactly the right kind of gentle.`,
              `That next-hour plan feels like a kind choice: quiet, doable, restorative. (${softEcho(a4, 90)})`,
            ])
          : null,
        memLine,
      ]
        .filter(Boolean)
        .join("\n\n");

    const question = pick([
      "What would make it easier to actually let work go tonight: a quick brain-dump, a boundary, or a good-enough plan for tomorrow?",
      "If you could give tired-you one permission slip tonight, what would it say?",
      "What’s the smallest version of rest you can actually do in the next 20 minutes?",
    ]);

    const nudges =
      Math.random() < 0.35
        ? pick([
            ["Write 3 bullets: what can wait / what can’t / what you’ll do tomorrow."],
            ["Choose one closing ritual: shower, tea/coffee, one chapter, lights out."],
          ])
        : undefined;

    return { mode: "local", mirror, question, nudges };
  }

  if (mode === "untangle") {
    const mirror =
      [
        pick([
          "This reads like you’re trying to turn a knot into something you can hold.",
          "You’re doing the right move here: naming the knot instead of letting it stay foggy.",
        ]),
        a1 ? `The knot is: ${softEcho(a1, 120)}.` : null,
        a2 ? `What’s in your control vs not in your control: ${softEcho(a2, 160)}.` : null,
        a3
          ? pick([
              `The story your brain is telling makes sense as a protective reflex. (${softEcho(a3, 140)})`,
              `That thought is heavy to carry. Noticing it is already progress. (${softEcho(a3, 140)})`,
            ])
          : null,
        a4
          ? pick([
              `Your next step is refreshingly real. (${softEcho(a4, 110)})`,
              `That next step is the kind that creates traction. (${softEcho(a4, 110)})`,
            ])
          : null,
        memLine,
      ]
        .filter(Boolean)
        .join("\n\n");

    const question = pick([
      "What’s the smallest piece of this that would change how you feel by 10%?",
      "If you assumed you don’t have to solve it today, what would you do next?",
    ]);

    const nudges =
      Math.random() < 0.35
        ? pick([
            ["Write: ‘If this goes okay, what changes? If it goes badly, what’s still true?’"],
            ["Name one assumption you can test in 24 hours."],
          ])
        : undefined;

    return { mode: "local", mirror, question, nudges };
  }

  // Default: Check-in or anything else.
  const mirror = [
    pick([
      "Thanks for checking in with yourself. This is the kind of small honesty that helps.",
      "This reads like a clear snapshot — not dramatic, just real.",
    ]),
    a1 ? `How you’re doing: ${softEcho(a1, 120)}.` : null,
    a2 ? `What’s taking space: ${softEcho(a2, 140)}.` : null,
    a3 ? `What you need more of: ${softEcho(a3, 120)}.` : null,
    memLine,
  ]
    .filter(Boolean)
    .join("\n\n");

  const question = pick([
    "If you could meet one of those needs today, what’s the smallest way you’d do it?",
    "What would support look like in the next 24 hours — structure, rest, or connection?",
  ]);

  return { mode: "local", mirror, question };
}
