import type { ReflectionOutput } from "../types";
import { extractNamedHobbyDetail, normalize, pick, softEcho } from "../shared";
import { detectPositiveWinCategory } from "../detect";
import { parseGuidedSession } from "../guided";

export function localWins(text: string, memLine: string | null): ReflectionOutput {
  const guided = parseGuidedSession(text);
  const category = detectPositiveWinCategory(text);

  const guidedWin = guided?.qa[0]?.a?.trim() ?? "";
  const guidedWhy = guided?.qa[1]?.a?.trim() ?? "";
  const guidedKindStory = guided?.qa[2]?.a?.trim() ?? "";
  const guidedNext = guided?.qa[3]?.a?.trim() ?? "";

  const anchor = guidedWin || normalize(text).slice(0, 180);

  const winEcho = (() => {
    const t = text.toLowerCase();
    if (category === "cooking") {
      const grounding = /\bgrounding\b/.test(t) ? " — and you even felt it as grounding" : "";
      return "You cooked a real meal instead of ordering in" + grounding + ".";
    }
    if (category === "life_admin") return "You handled a real-life task that makes future-you’s day easier.";
    if (category === "gym" || category === "movement") return "You chose movement even when it would’ve been easier to skip it.";
    if (category === "social") return "You showed up socially and let connection count as part of the day.";
    if (category === "hobby") {
      const { hobby, detail } = extractNamedHobbyDetail(text);
      if (hobby && detail) return `You made space for ${hobby} — and you even spent time with ${detail}.`;
      if (hobby) return `You made space for ${hobby} — the kind of win that actually restores you.`;
      return "You made space for something that restores you, not just something you have to do.";
    }
    const e = softEcho(anchor, 120);
    return e ? `You noticed something worth giving yourself credit for: ${e.toLowerCase()}.` : "You noticed something worth giving yourself credit for.";
  })();

  const categoryLine = (() => {
    if (category === "gym") {
      return pick([
        "Going to the gym (especially when you’ve been avoiding it) is a bigger step than it sounds — it’s walking into effort on purpose.",
        "The first gym trip is its own hurdle — new space, new rhythm, new discomfort. Showing up anyway matters.",
      ]);
    }
    if (category === "movement") {
      return pick([
        "Choosing movement on a day you could’ve stayed stuck is a quiet kind of self-trust.",
        "That kind of ‘I did it anyway’ energy is how momentum starts.",
      ]);
    }
    if (category === "social") {
      return pick([
        "Showing up socially can take real energy — especially when it’d be easier to stay in your head.",
        "Connection counts as a win. It’s you choosing life outside the loop.",
      ]);
    }
    if (category === "hobby") {
      return pick([
        "Making space for a hobby is you giving yourself more than just responsibilities.",
        "That’s the kind of win that restores you — not just checks a box.",
      ]);
    }
    if (category === "cooking") {
      return pick([
        "Cooking for yourself is care you can actually taste.",
        "That’s a grounded win — effort that turns into something real.",
      ]);
    }
    if (category === "health_progress") {
      return pick([
        "Noticing progress is good — the part that really matters is the pattern you’re building to support yourself.",
        "That’s a meaningful step. Sustainable progress is usually made of moments exactly like this.",
      ]);
    }
    if (category === "life_admin") {
      return pick([
        "Life-admin wins count. Clearing one small thing can unclog your whole day.",
        "That’s you reducing friction for future-you — genuinely kind.",
      ]);
    }
    return pick([
      "This is worth holding onto. Wins don’t have to be dramatic to count.",
      "I love that you noticed this. That’s how you build a record of what actually works for you.",
      "That’s a real bright spot. Let it land.",
    ]);
  })();

  const mirrorParts: string[] = [];
  mirrorParts.push(
    guided
      ? pick([
          `That’s a real win — and it sounds earned. (${guided.modeTitle} sessions are basically practice reps for your life.)`,
          `This reads like a genuine “I moved myself forward” moment.`,
        ])
      : pick(["That’s a real win.", "This deserves credit."])
  );

  // Paraphrase a specific detail without quoting the user.
  mirrorParts.push(winEcho);

  mirrorParts.push(categoryLine);

  if (guidedWhy) {
    mirrorParts.push(
      pick([
        `And your “why” is clear — you’re choosing a shift, not waiting for motivation. (${softEcho(guidedWhy, 140)})`,
        `You didn’t just stumble into it — there was intention behind it. (${softEcho(guidedWhy, 140)})`,
      ])
    );
  }

  if (guidedKindStory) {
    mirrorParts.push(
      pick([
        `I also hear something kind in how you talked to yourself. Keep that voice around — it makes change sustainable. (${softEcho(guidedKindStory, 120)})`,
        `The tone you used with yourself matters here. It’s the kind that makes growth sustainable. (${softEcho(guidedKindStory, 120)})`,
      ])
    );
  }

  if (guidedNext) {
    mirrorParts.push(
      pick([
        `Next step is simple on purpose — consistency beats intensity. (${softEcho(guidedNext, 90)})`,
        `That next step is perfect because it’s doable. Keep it small enough that it actually happens. (${softEcho(guidedNext, 90)})`,
      ])
    );
  }

  const question = pick([
    "What would make the next time 10% easier to start?",
    "If you replay this win, what part of *you* do you want to remember most?",
    "What’s the smallest, most realistic version of your next step this week?",
  ]);

  const nudges =
    Math.random() < 0.3
      ? pick([
          ["Write one line to future-you: “When it feels hard, remember…”"],
          ["Pick a tiny ‘minimum version’ of the habit you can do even on a bad day."],
          ["Name what helped: time, place, cue, or a thought that pushed you forward."],
        ])
      : undefined;

  return {
    mode: "local",
    mirror: [mirrorParts.join("\n\n"), memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

export function localHobbyJoy(text: string, memLine: string | null): ReflectionOutput {
  const { hobby, detail } = extractNamedHobbyDetail(text);
  const lower = text.toLowerCase();
  const ease = /\b(ease|at ease|calm|calming|ground|grounding|relax|relaxing|peace)\b/.test(lower);
  const focus = /\b(focus|focused|flow|in the zone)\b/.test(lower);

  const hobbyPhrase = hobby ? hobby : "a hobby you love";
  const detailPhrase = detail ? `, especially ${detail}` : "";

  const mirror =
    [
      pick([
        "This reads like the good kind of fun, the kind that gives you something back.",
        "I love this kind of entry. It has real lightness in it.",
        "That sounds genuinely nourishing, not just nice.",
      ]),
      `You made space for ${hobbyPhrase}${detailPhrase}.`,
      ease
        ? "And it sounds like it settled your mind. Not by solving anything, just by bringing you back into your body and attention."
        : focus
        ? "It sounds like it pulled you into focus, the kind where your brain gets a break from noise."
        : "It reads like it gave you a clean, steady kind of ease.",
      pick([
        "That’s not trivial. That’s you remembering what helps.",
        "Moments like that are how you build a life that isn’t only obligations.",
      ]),
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n");

  const question = pick([
    `What part of ${hobbyPhrase} did your mind need today: the focus, the sound, the challenge, or the comfort?`,
    "What do you think made it feel so calming this time: the music itself, or the act of playing?",
    "If you wanted more days like this, what’s the smallest version you could repeat (even 10 minutes)?",
  ]);

  const nudges =
    Math.random() < 0.4
      ? pick([
          ["Tiny note: where were you playing, and what time of day? Sometimes the setting is part of the calm."],
          ["Optional: write one line you’d want to reread on a rough day: ‘When I play, I remember that…’"],
        ])
      : undefined;

  return { mode: "local", mirror, question, nudges };
}
