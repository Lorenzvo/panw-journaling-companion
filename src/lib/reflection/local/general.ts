import type { ReflectionOutput } from "../types";
import { extractAnchor, pick, softEcho } from "../shared";
import { detectMoodSwingIrritability, detectPositiveWinCategory } from "../detect";

export function localNewToJournaling(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 140);
  const mirror = pick([
    "You’re in the right place. You don’t need a perfect starting point, just a first sentence.",
    "Totally normal to not know where to start. Let’s make it easy and low-pressure.",
    "We can keep this simple. This is a place to think out loud, not a place to write perfectly.",
  ]);

  const question = pick([
    "What do you want most right now: to vent, to understand a pattern, or to calm down?",
    "Do you want to start with what happened today, what you’re feeling, or what you’ve been carrying lately?",
  ]);

  const nudges = pick([
    [
      "Tiny start: Today was ___ because ___.",
      "Or: Right now I feel ___ and I need ___.",
      "Or: One thing I wish I could say out loud is ___.",
    ],
    [
      "Write 3 bullets: what happened / how it affected you / what you want next.",
      "If that’s too much: write just one word for your mood.",
    ],
  ]);

  return {
    mode: "local",
    mirror: [
      mirror,
      anchor ? `One concrete thing you already named is: ${softEcho(anchor, 120)}. We can start there.` : null,
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
}

export function localTooTired(): ReflectionOutput {
  return {
    mode: "local",
    mirror: pick([
      "That’s completely valid. If you’re wiped, journaling can be tiny — not a project.",
      "If you’re too tired to journal, that counts as information. Let’s make this a 10-second check-in.",
    ]),
    question: "Want a 10-second version so you still get the “I showed up” feeling?",
    nudges: [
      "Fill one blank: Today was ___.",
      "Or: The main thing was ___.",
      "Or: Tomorrow I want ___ (even if it’s just rest).",
    ],
  };
}

export function localGoodNothingNew(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Honestly, that’s a kind of win. “Good” and “nothing dramatic” can be exactly what you needed.",
    "A steady day counts. It’s nice when nothing is on fire.",
    "That sounds like a calm, okay day — and it’s worth noticing that.",
  ]);

  const question = pick([
    "What made it feel good — people, progress, relief, or just a calmer pace?",
    "Was there one small moment you’d want to remember from today?",
    "If you could repeat one thing from today tomorrow, what would it be?",
  ]);

  const nudges = Math.random() < 0.45 ? ["Optional: one sentence you’d like to reread later."] : undefined;

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

export function localFinances(_text: string, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Money stress can feel so loud because it touches safety. I’m sorry you’re carrying that today.",
    "That sounds really heavy — finances have a way of sitting in the background of everything.",
    "I hear the strain here. Money pressure can make even small things feel sharper.",
  ]);

  const question = pick([
    "Is this more about the numbers right now, or the uncertainty of not knowing what’s next?",
    "What’s the most immediate pressure — a bill, a deadline, or just the ongoing stress of it?",
  ]);

  const nudges = pick([
    [
      "Tiny step: write the next one thing you need to handle (just one).",
      "Optional: what support would actually help — a plan, a conversation, or a little relief today?",
    ],
    [
      "Two bullets: what’s urgent this week / what can wait until later.",
      "If you want: one small action that might reduce stress by 5%.",
    ],
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges: nudges.slice(0, 3),
  };
}

export function localSelfWorth(_text: string, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That thought that everyone hates you is a really painful place to be. I’m glad you wrote it instead of keeping it sealed in.",
    "I hear how harsh this feels. When your brain is telling you people hate you, it can make everything feel personal and heavy.",
    "That’s a lot to sit with. Feeling disliked or unwanted can hit deeper than the situation itself.",
  ]);

  const question = pick([
    "Did something specific happen that sparked that feeling today, or is it more of a general vibe?",
    "When that thought shows up, what’s the most convincing ‘evidence’ your mind points to?",
  ]);

  const nudges = pick([
    [
      "Name one person you feel even 5% safer with (or write: none right now).",
      "Optional: what would you *want* to hear from someone if they understood how you feel?",
    ],
    [
      "Try one line: The story my brain is telling is…",
      "Then one line: What I actually know for sure is…",
    ],
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges: nudges.slice(0, 3),
  };
}

export function localMentalWellness(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 160);

  const moodSwing = detectMoodSwingIrritability(text);

  if (moodSwing) {
    const mirror1 = pick([
      "That swing between feeling fine and feeling irritated can be exhausting — especially when you can’t point to one clear trigger.",
      "It makes sense this feels confusing. When your mood flips without an obvious reason, it can feel like you can’t trust your own footing.",
    ]);

    const mirror2 = pick([
      "It doesn’t read like you’re just ‘mad at everyone’ — it reads like your bandwidth is getting quietly taxed and the irritation is the first signal.",
      "I don’t think you need a perfect explanation to start. Sometimes the useful thing is noticing what tends to be true on the harder days.",
    ]);

    const question = pick([
      "When you notice the irritation starting, does it usually show up after something specific, or does it feel random?",
      "If you look back at the last couple ‘harder’ days, were there any early signs — even small ones (sleep, hunger, stress, too much noise)?",
    ]);

    const nudges =
      Math.random() < 0.6
        ? pick([
            [
              "Two bullets: what was different about the day (sleep/food/stress/social), and what the irritation made you want to do.",
              "Then one line: The earliest sign was ___.",
            ],
            [
              "Finish: I notice I get irritated when ___.",
              "Finish: What I actually need in those moments is ___.",
            ],
          ])
        : undefined;

    return {
      mode: "local",
      mirror: [mirror1, anchor ? `One thing you’ve already noticed is: ${softEcho(anchor, 150)}.` : null, mirror2, memLine]
        .filter(Boolean)
        .join("\n\n"),
      question,
      nudges,
    };
  }

  const mirror1 = pick([
    "I hear how confusing that feels — especially when the anger shows up without a clear reason.",
    "That sounds really hard to sit with: wanting connection sometimes, and wanting to disappear other times.",
    "You’re not alone in this pattern. Avoiding people can be protective — even when you don’t want it to be.",
  ]);

  const mirror2 = pick([
    "We don’t have to label it perfectly (attachment, trauma, etc.) to start noticing what’s happening.",
    "If you want, we can treat this like pattern-spotting, not self-judgment.",
    "We can go slow here — clarity usually comes from small observations.",
  ]);

  const question = pick([
    "When you feel that urge to avoid people, what’s the first signal you notice (body feeling, thought, or emotion)?",
    "Is the anger more like irritation, overwhelm, or feeling misunderstood?",
    "Does it feel like you’re protecting your energy — or protecting yourself from closeness?",
  ]);

  const nudges = pick([
    [
      "Write 2 bullets: “When it happens…” and “What I wish people knew…”",
      "Finish: “I think I avoid people when…”",
    ],
    [
      "Tiny timeline: when did you first notice this pattern?",
      "What’s one situation where you *didn’t* feel avoidant — what was different?",
    ],
  ]);

  return {
    mode: "local",
    mirror: [mirror1, anchor ? `What you’re noticing is: ${softEcho(anchor, 150)}.` : null, mirror2, memLine]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
}

export function localDecisions(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Big decisions feel heavy because you’re choosing a future — and closing other doors at the same time.",
    "Being torn usually means both options matter to you in different ways. That’s not indecision — that’s values clashing.",
    "We can slow it down. Clarity usually comes from naming what you’re optimizing for.",
  ]);

  const question = pick([
    "If you chose option A, what would you gain — and what would you quietly lose?",
    "What are you optimizing for right now: peace, growth, money, time, or belonging?",
  ]);

  const nudges =
    Math.random() < 0.5
      ? pick([
          ["Write 2 columns: “what I know” vs “what I’m assuming.”"],
          ["Finish: “The option that scares me more is ___ because ___."],
        ])
      : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

export function localAnxiety(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 150);
  const mirror = pick([
    "That sounds like your brain is looping — like it won’t let the thought set down.",
    "Overthinking usually means you care, and you don’t feel fully safe with uncertainty right now.",
    "That spiral feeling is exhausting. You’re not weak for getting stuck in it.",
  ]);

  const question = pick([
    "What’s the one fear underneath the loop — the thing your brain keeps trying to prevent?",
    "If you zoom out: is this a problem you can solve, or a feeling you need to sit with for a moment?",
  ]);

  const nudges =
    Math.random() < 0.55
      ? pick([
          ["Write: “The story my anxiety is telling is…” then “The evidence I have is…”"],
          ["Set a 2-minute timer and brain-dump every thought. No punctuation needed."],
        ])
      : undefined;

  return {
    mode: "local",
    mirror: [mirror, anchor ? `The loop I’m hearing is: ${softEcho(anchor, 140)}.` : null, memLine]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
}

export function localHealthPositive(text: string, memLine: string | null): ReflectionOutput {
  const category = detectPositiveWinCategory(text);

  const mirror =
    category === "gym"
      ? pick([
          "That’s a strong kind of win — you went to the gym. The first step is often the hardest one.",
          "Going to the gym counts twice: you did the effort, and you proved you can start.",
        ])
      : pick([
          "That sounds like your body got something good today.",
          "That kind of self-care is quiet, but it’s real.",
        ]);

  const question = pick([
    "What helped you actually get started — timing, mindset, a plan, someone else?",
    "What would you want to repeat from this the next time you try it?",
  ]);

  const nudges =
    Math.random() < 0.25
      ? pick([
          ["Write one sentence: “I’m the kind of person who…” (keep it believable)."],
          ["Pick a tiny next step you can do within 24 hours."],
        ])
      : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

export function localFoodPositive(text: string, memLine: string | null): ReflectionOutput {
  const lower = text.toLowerCase();
  const userSaidYummy = /\b(yummy|delicious|tasty)\b/.test(lower);

  const mirror = pick([
    "Honestly, a good meal can change the whole day’s vibe.",
    "I love when the journal is just: that was nice. Simple joys count.",
    "That sounds like a small reset — the kind you actually feel in your body.",
  ]);

  const nudges = Math.random() < 0.25 ? [userSaidYummy ? "Write one line: Today tasted like…" : "Write one line: Today felt like…"] : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), nudges };
}
