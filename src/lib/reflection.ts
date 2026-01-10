import type { UserMemory } from "../types/memory";

export type ReflectionOutput = {
  mirror: string;
  question?: string;
  nudges?: string[];
  mode: "local" | "enhanced";
};

const SAFETY_NOTE =
  "If you’re feeling like you might hurt yourself, you deserve real-time support. If you’re in the U.S., you can call or text **988**. If you’re elsewhere, I can help find local resources. If you’re in immediate danger, call your local emergency number.";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalize(text: string) {
  return (text ?? "").trim().replace(/\s+/g, " ");
}

function looksLikeGibberish(text: string) {
  const t = normalize(text);
  if (!t) return true;
  if (t.length <= 2) return true;

  const letters = (t.match(/[a-z]/gi) ?? []).length;
  if (letters === 0) return true;

  // Super low vowel ratio is a decent keysmash signal for longer strings.
  const vowels = (t.match(/[aeiou]/gi) ?? []).length;
  if (letters >= 8 && vowels / Math.max(1, letters) < 0.18) return true;

  const ratio = letters / Math.max(1, t.length);

  const words = t.split(" ").filter(Boolean);
  if (t.length < 8 && words.length <= 1) return true;
  if (ratio < 0.45 && t.length < 18) return true;

  return false;
}

function looksLikeSelfHarm(text: string) {
  const t = text.toLowerCase();
  return /(suicid|kill myself|end my life|end it|self[- ]?harm|hurt myself|i want to die|want to die)/.test(t);
}

function ensureSafetyNote(mirror: string, text: string) {
  if (!looksLikeSelfHarm(text)) return mirror;
  if (/\b988\b/.test(mirror)) return mirror;
  return [mirror, SAFETY_NOTE].filter(Boolean).join("\n\n");
}

type Tone = "positive" | "negative" | "mixed" | "neutral";
type Topic =
  | "work"
  | "new_to_journaling"
  | "mental_wellness"
  | "relationships"
  | "decisions"
  | "anxiety_rumination"
  | "wins_gratitude"
  | "food"
  | "school"
  | "health"
  | "general";

function detectStartHelpIntent(text: string) {
  const t = text.toLowerCase();
  return (
    /(where do i even start|where do i start|how do i start|dont know where to start|don't know where to start|don’t know where to start|where should i start|what do i write|help me journal|how do i journal|blank page|i'?m new to journaling|im new to journaling)/.test(
      t
    ) ||
    (/\bstart\b/.test(t) && /\bwhere\b/.test(t) && t.length <= 40)
  );
}

function detectTooTired(text: string) {
  const t = text.toLowerCase();
  return /(too tired|tired to journal|exhausted to journal|can't journal|cant journal|don'?t have the energy|dont have the energy|no energy|brain dead|i'?m done|im done|wiped|too exhausted)/.test(
    t
  );
}

function detectGoodNothingNew(text: string) {
  const t = text.toLowerCase();
  const calmPositive = /\b(good|great|fine|ok|okay|nice|calm)\b/.test(t);
  const nothingMuch = /\b(nothing new|nothing much|nothing really|not much)\b/.test(t);
  return calmPositive && nothingMuch;
}

function detectTone(text: string): Tone {
  const t = text.toLowerCase();

  const pos =
    /\b(happy|excited|grateful|thankful|proud|relieved|good|great|amazing|fun|nice|love|calm|win|won|blessed)\b/.test(
      t
    );

  const neg =
    /\b(sad|down|anxious|panic|worry|worried|angry|mad|overwhelm|exhausted|burnt|stress|stressed|frustrat|tired|avoid|worst|miserable|hate|spiral|overthink)\b/.test(
      t
    ) || /\bno time\b/.test(t);

  if (pos && neg) return "mixed";
  if (pos) return "positive";
  if (neg) return "negative";
  return "neutral";
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase();

  // New to journaling / onboarding (catch very short asks too)
  if (
    detectStartHelpIntent(t) ||
    /\b(start journaling|journal(ing)?|document(ing)? my thoughts)\b/i.test(t)
  ) {
    return "new_to_journaling";
  }
  

  // Mental wellness / patterns
  if (
    /\b(mental health|state of mind|anger|attachment|childhood trauma|trauma|avoidant|anxious attachment|pattern|why am i)\b/.test(
      t
    )
  ) {
    return "mental_wellness";
  }

  // Work
  if (
    /\b(boss|work|job|meeting|deadline|on-call|shift|coworker|manager|client|clients)\b/.test(t) ||
    (/\bcall\b/.test(t) && /\b(client|clients|meeting|work|boss)\b/.test(t))
  ) {
    return "work";
  }

  // Relationships
  if (
    /\b(friend|friends|family|partner|relationship|dating|breakup|lonely|alone|argue|fight|conflict|roommate)\b/.test(
      t
    ) ||
    (/\bcall\b/.test(t) && !/(client call|work call|business call|call with client)/.test(t))
  ) {
    return "relationships";
  }

  // Decisions / uncertainty
  if (
    /\b(decide|decision|choose|choice|torn|unsure|uncertain|regret|should i|what if|stuck between)\b/.test(t)
  ) {
    return "decisions";
  }

  // Anxiety / rumination
  if (
    /\b(overthink|spiral|ruminat|intrusive thoughts|can'?t stop thinking|looping|catastroph)\b/.test(t)
  ) {
    return "anxiety_rumination";
  }

  // Wins / gratitude
  if (/\b(grateful|thankful|small win|proud of|celebrat|went well|good news)\b/.test(t)) {
    return "wins_gratitude";
  }

  if (/\b(ate|eating|dinner|lunch|breakfast|restaurant|food)\b/.test(t)) return "food";
  if (/\b(homework|assignment|exam|quiz|class|school|study|professor)\b/.test(t)) return "school";
  if (/\b(sleep|rest|sick|headache|energy|gym|workout|run|walk)\b/.test(t)) return "health";

  return "general";
}

function maybeMemoryLine(mem: UserMemory | undefined, tone: Tone, topic: Topic): string | null {
  if (!mem) return null;

  // subtle but demo-visible
  const show = Math.random() < 0.28;
  if (!show) return null;

  if ((tone === "negative" || tone === "mixed") && mem.coping.length) {
    const c = pick(mem.coping);
    return pick([
      `Small thing I’m remembering: you’ve said **${c}** can help sometimes. Does that feel true today, or not really?`,
      `You’ve mentioned **${c}** helping before — not as a fix, just as a small reset.`,
    ]);
  }

  if (tone === "positive" && mem.likes.length && topic !== "work") {
    const l = pick(mem.likes);
    return pick([
      `Tiny callback: you’ve mentioned you like **${l}** — small joys count.`,
      `This kind of reminds me of what you said about **${l}** — it fits this lighter moment.`,
    ]);
  }

  if (mem.wins.length && tone !== "negative") {
    const w = pick(mem.wins);
    return pick([
      `Small reminder: you’ve had wins like **${w}** — you’re building a pattern.`,
      `You’ve been stacking small wins (like **${w}**).`,
    ]);
  }

  return null;
}

// Detect “I already answered the question” patterns
function extractAnsweredDrainingPart(text: string): string | null {
  const t = text.toLowerCase();
  const m = t.match(/(the most draining.*?is|most draining.*?is|it'?s the).*?(\.|$)/);
  if (!m) return null;

  // grab a short slice of the original (not lowercased) for nicer echo
  const idx = t.indexOf(m[0]);
  if (idx === -1) return "that part about your time not feeling like yours";
  const originalSlice = text.slice(idx, Math.min(text.length, idx + 140)).trim();
  return originalSlice.length ? originalSlice : "that part about your time not feeling like yours";
}

function localNewToJournaling(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "You’re in the right place. You don’t need a perfect “starting point” — you just need a first sentence.",
    "Totally normal to not know where to start. Let’s make it easy and low-pressure.",
    "We can keep this simple. Think of this as a place to talk out loud, not a place to write well.",
  ]);

  const question = pick([
    "What do you want most right now: to vent, to understand a pattern, or to calm down?",
    "Do you want to start with what happened today, what you’re feeling, or what you’ve been carrying lately?",
  ]);

  const nudges = pick([
    [
      "Option A: “Today was ___ because ___.”",
      "Option B: “Right now I feel ___ and I need ___.”",
      "Option C: “One thing I wish I could say out loud is ___.”",
    ],
    [
      "Write 3 bullets: what happened / how it affected you / what you want next.",
      "If that’s too much: write just one word for your mood.",
    ],
  ]);

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localTooTired(): ReflectionOutput {
  return {
    mode: "local",
    mirror: pick([
      "That’s completely valid. If you’re wiped, journaling can be tiny — not a project.",
      "If you’re too tired to journal, that counts as information. Let’s make this a 10-second check-in.",
    ]),
    question: "Want a 10-second version so you still get the “I showed up” feeling?",
    nudges: [
      "Fill one blank: \"Today was ___.\"",
      "Or: \"The main thing was ___.\"",
      "Or: \"Tomorrow I want ___ (even if it’s just rest).\"",
    ],
  };
}

function localGoodNothingNew(memLine: string | null): ReflectionOutput {
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

function localRelationshipsPositive(_text: string, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That sounds like a good connection moment — the kind that quietly refills you.",
    "I’m glad there was something warm here. Relationship stuff can be heavy, so a lighter moment matters.",
    "That reads like closeness that actually felt okay. That’s worth marking.",
  ]);

  const question = pick([
    "What part of it felt most grounding — the conversation, the vibe, or feeling understood?",
    "Did it give you energy, or more of a calm?",
  ]);

  const nudges =
    Math.random() < 0.35
      ? ["Optional: write one line you’d want to remember about how this felt."]
      : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localMentalWellness(memLine: string | null): ReflectionOutput {
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

  return { mode: "local", mirror: [mirror1, mirror2, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localWorkStress(text: string, memLine: string | null): ReflectionOutput {
  const answered = extractAnsweredDrainingPart(text);

  const mirror1 = pick([
    "Yeah… that sounds brutal. It’s not just “busy” — it’s the kind of day that leaves no room to breathe.",
    "That’s a lot. When your whole day is calls + meetings + clients, it can feel like you don’t exist outside of work.",
    "I get why you’d feel like you’re putting too much into work. That reads like constant output with no refill.",
  ]);

  const mirror2 = answered
    ? `And you naming it — ${answered} — honestly makes total sense. That’s a really specific kind of draining.`
    : pick([
        "Also, the “eh whatever” at the end feels like your brain trying to shut it down just to get through it.",
        "That “eh whatever” feels like fatigue talking — like you’re trying not to feel the whole thing at once.",
      ]);

  // If they already answered “what’s most draining”, don’t ask it again—move forward.
  const question = answered
    ? pick([
        "What would a *realistic* boundary look like here — even a small one you could hold this week?",
        "If you could change one thing that protects your time, what’s the most doable change?",
      ])
    : pick([
        "What part of this is most draining — the schedule, the pressure, or the feeling that your time isn’t yours?",
        "If you could change one thing about your work week right now, what would give you the biggest relief?",
      ]);

  const nudges =
    Math.random() < 0.6
      ? pick([
          ["Name one boundary you wish you had today (time, scope, availability)."],
          ["Write one sentence: “What I need more of is ___.”", "And one: “What I need less of is ___.”"],
          ["Quick check: what’s one small thing you can do tonight that belongs to *you*?"],
        ])
      : undefined;

  const safety =
    looksLikeSelfHarm(text)
      ? "If you’re feeling like you might hurt yourself, you deserve real-time support. If you’re in the U.S., you can call or text **988**. If you’re elsewhere, I can help find local resources. If you’re in immediate danger, call your local emergency number."
      : null;

  return {
    mode: "local",
    mirror: [mirror1, mirror2, memLine, safety].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

function localRelationships(_text: string, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Relationship stuff hits different because it’s not just the event — it’s what it says about closeness, trust, or being understood.",
    "I hear the tension here. It sounds like part of you wants connection, and another part wants distance.",
    "That sounds emotionally loud — like it’s taking up space even when you’re trying not to think about it.",
  ]);

  const question = pick([
    "What’s the part that’s hardest to say out loud — what happened, or what you’re afraid it means?",
    "If you had to name what you needed in that moment, what was it — reassurance, space, respect, honesty?",
  ]);

  const nudges = Math.random() < 0.5 ? pick([
    ["Write one sentence you *wish* you could say to them (you don’t have to send it)."],
    ["Two bullets: what you want from them / what you want for yourself."],
  ]) : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localDecisions(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Big decisions feel heavy because you’re choosing a future — and closing other doors at the same time.",
    "Being torn usually means both options matter to you in different ways. That’s not indecision — that’s values clashing.",
    "We can slow it down. Clarity usually comes from naming what you’re optimizing for.",
  ]);

  const question = pick([
    "If you chose option A, what would you gain — and what would you quietly lose?",
    "What are you optimizing for right now: peace, growth, money, time, or belonging?",
  ]);

  const nudges = Math.random() < 0.5 ? pick([
    ["Write 2 columns: “what I know” vs “what I’m assuming.”"],
    ["Finish: “The option that scares me more is ___ because ___.”"],
  ]) : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localAnxiety(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That sounds like your brain is looping — like it won’t let the thought set down.",
    "Overthinking usually means you care, and you don’t feel fully safe with uncertainty right now.",
    "That spiral feeling is exhausting. You’re not weak for getting stuck in it.",
  ]);

  const question = pick([
    "What’s the one fear underneath the loop — the thing your brain keeps trying to prevent?",
    "If you zoom out: is this a problem you can solve, or a feeling you need to sit with for a moment?",
  ]);

  const nudges = Math.random() < 0.55 ? pick([
    ["Write: “The story my anxiety is telling is…” then “The evidence I have is…”"],
    ["Set a 2-minute timer and brain-dump every thought. No punctuation needed."],
  ]) : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localWins(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "This is worth holding onto. Wins don’t have to be dramatic to count.",
    "I love that you noticed this. That’s how you build a record of what actually works for you.",
    "That’s a real bright spot. Let it land.",
  ]);

  const includeQuestion = Math.random() < 0.35;
  const question = includeQuestion ? pick([
    "What did you do that helped make this happen?",
    "What do you want future-you to remember about this moment?",
  ]) : undefined;

  const nudges = Math.random() < 0.25 ? ["Write one line: “I’m proud that I…”"] : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localFoodPositive(text: string, memLine: string | null): ReflectionOutput {
  const lower = text.toLowerCase();
  const userSaidYummy = /\b(yummy|delicious|tasty)\b/.test(lower);

  const mirror = pick([
    "Honestly, a good meal can change the whole day’s vibe.",
    "I love when the journal is just: “that was nice.” Simple joys count.",
    "That sounds like a small reset — the kind you actually feel in your body.",
  ]);

  const nudges = Math.random() < 0.25 ? [userSaidYummy ? "Write one line: “Today tasted like…”" : "Write one line: “Today felt like…”"] : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), nudges };
}

export function generateLocalReflection(entryText: string, mem?: UserMemory): ReflectionOutput {
  const cleaned = normalize(entryText);

  if (looksLikeGibberish(cleaned)) {
    const out: ReflectionOutput = {
      mode: "local",
      mirror:
        "I’m here. That looks super short (or maybe a key-smash).\n\nIf you want, give me **one more sentence** — what happened today, or what you’re feeling right now.",
      question: "Do you want to write about your day, your mood, or one specific moment?",
      nudges: ["Finish: “Right now I feel…”", "Finish: “What’s on my mind is…”"],
    };
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  // “I’m too tired” handling: keep it tiny and non-demanding.
  if (detectTooTired(cleaned)) {
    const out = localTooTired();
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  const tone = detectTone(cleaned);
  const topic = detectTopic(cleaned);
  const memLine = maybeMemoryLine(mem, tone, topic);

  if (tone === "positive" && detectGoodNothingNew(cleaned)) {
    const out = localGoodNothingNew(memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  if (topic === "new_to_journaling") return localNewToJournaling(memLine);
  if (topic === "mental_wellness") return localMentalWellness(memLine);
  if (topic === "relationships" && tone === "positive") return localRelationshipsPositive(cleaned, memLine);
  if (topic === "relationships") return localRelationships(cleaned, memLine);
  if (topic === "decisions") return localDecisions(memLine);
  if (topic === "anxiety_rumination") return localAnxiety(memLine);
  if (topic === "wins_gratitude") return localWins(memLine);

  if (topic === "food" && tone === "positive") return localFoodPositive(cleaned, memLine);

  if (topic === "work" && (tone === "negative" || tone === "mixed")) return localWorkStress(cleaned, memLine);

  if (tone === "positive") {
    const short = cleaned.length < 40;
    const out: ReflectionOutput = short
      ? {
          mode: "local",
          mirror: [
            pick([
              "That sounds like a small win, and it counts.",
              "Nice. Even a simple “good” day deserves a little space.",
              "I’m glad there was something good in there.",
            ]),
            memLine,
          ]
            .filter(Boolean)
            .join("\n\n"),
          question: pick([
            "What made it feel good — people, progress, relief, or just a calmer pace?",
            "If you had to name one detail you’d want to remember, what is it?",
            "What do you want to repeat from today, even gently?",
          ]),
          nudges: Math.random() < 0.25 ? ["Optional: one sentence you’d like to reread later."] : undefined,
        }
      : {
          mode: "local",
          mirror: [
            pick([
              "That sounds like a good moment to keep.",
              "That reads like something that actually gave you a little back.",
              "I’m glad you let this land enough to write it down.",
            ]),
            memLine,
          ]
            .filter(Boolean)
            .join("\n\n"),
          question: Math.random() < 0.3 ? "What part do you want to remember most?" : undefined,
        };

    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  if (tone === "negative" || tone === "mixed") {
    const out: ReflectionOutput = {
      mode: "local",
      mirror: ["That sounds heavy. I’m here with you in it.", memLine].filter(Boolean).join("\n\n"),
      question: "What feels like the sharpest part of this?",
      nudges: Math.random() < 0.4 ? ["Write one sentence: “What I needed was…”"] : undefined,
    };
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  // neutral fallback
  const out: ReflectionOutput = {
    mode: "local",
    mirror: [
      pick([
        "Logged. I’m here with you.",
        "Okay. I’m with you.",
        "Got it. If you want, we can zoom in a little.",
      ]),
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n"),
    question: Math.random() < 0.35 ? "Want to add one detail that makes it feel more like today?" : undefined,
    nudges:
      Math.random() < 0.2
        ? ["You can keep it simple: \"Today felt ___ because ___.\""]
        : undefined,
  };
  return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
}

export async function generateEnhancedReflection(
  entryText: string,
  mem?: UserMemory
): Promise<ReflectionOutput> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const cleaned = normalize(entryText);

  if (!apiKey) return generateLocalReflection(cleaned, mem);
  if (looksLikeGibberish(cleaned)) return generateLocalReflection(cleaned, mem);

  const tone = detectTone(cleaned);
  const topic = detectTopic(cleaned);
  const tooTiredIntent = detectTooTired(cleaned);
  const goodNothingNewIntent = detectGoodNothingNew(cleaned);

  const memoryContext = mem
    ? {
        coping: mem.coping.slice(0, 5),
        likes: mem.likes.slice(0, 5),
        stressors: mem.stressors.slice(0, 5),
        wins: mem.wins.slice(0, 5),
      }
    : { coping: [], likes: [], stressors: [], wins: [] };

  const answeredHint = extractAnsweredDrainingPart(cleaned)
    ? "The entry includes a direct answer to a previous question (e.g., “the most draining part is…”). Acknowledge it and build forward—do not re-ask."
    : "No explicit answered-question patterns detected.";

  const safetyHint = looksLikeSelfHarm(cleaned)
    ? "If the entry implies self-harm or suicide intent, include a short supportive note and encourage reaching local crisis resources; in the U.S. mention 988. Do not be alarmist."
    : "Avoid medical claims. Don’t diagnose.";

  // Topic forcing: prevents generic responses when user is clearly asking for journaling help.
  const topicDirectives = `
Topic handling requirements:
- If detectedTopic is "new_to_journaling": you MUST give actionable getting-started guidance (2–4 short lines) and include 1 gentle question. Do NOT reply with generic encouragement like “not every entry has to be deep.” The user is explicitly asking for help starting.
- If intentTooTired is true: normalize it and offer a tiny (10–30 second) journaling option (2–3 concrete prompts). Ask 1 gentle question.
- If intentGoodNothingNew is true and tone is positive: validate it as a small win (calm counts) and ask a small follow-up that fits.
- If detectedTopic is "work": validate + name the likely stressor (schedule/pressure/time not feeling yours) and ask 1 next-step question that fits the entry.
- If detectedTopic is "wins_gratitude": it’s OK to be short, and it’s OK to have no question.
- If detectedTopic is "general" and tone is neutral: keep it light, but still respond to what they actually said (no template filler).
`.trim();

  const prompt = `
You are a journaling companion that feels HUMAN and conversational — like a thoughtful friend who listens well.
The user wants something they could use long-term, not a template.

Critical rules:
- DO NOT invent details, phrases, or vibes the user didn’t say.
- Do NOT quote the user or say “You wrote:”.
- Avoid therapy clichés unless truly appropriate.
- Mirror should be 2–6 sentences. (Short is okay if it fits.)
- Question and nudges are optional and can be null.
- If the user is asking a direct question (e.g., “where do I start?”), you must answer it directly.
- If the entry already answers a prior question inside it, acknowledge that and move forward (don’t ignore it).
- Use memory subtly and not every time.

${topicDirectives}

Extra hint: ${answeredHint}
${safetyHint}

Context:
- detectedTone: ${tone}
- detectedTopic: ${topic}
- intentTooTired: ${tooTiredIntent}
- intentGoodNothingNew: ${goodNothingNewIntent}
- memory: ${JSON.stringify(memoryContext)}

User entry:
${cleaned}

Return ONLY JSON (no markdown, no commentary):
{
  "mirror": string,
  "question": string | null,
  "nudges": string[] | null
}
`.trim();

  // Optional: abort/timeout so a hung request doesn’t stall UI
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o",
        input: prompt,
        max_output_tokens: 650,
        text: { format: { type: "json_object" } },
      }),
    });

    if (!res.ok) return generateLocalReflection(cleaned, mem);

    const data: any = await res.json();

    // Most reliable: output_text if present
    const candidate =
      (typeof data.output_text === "string" && data.output_text.trim()) ||
      "";

    let textOut = candidate;

    // Fallback: traverse output blocks if output_text missing
    if (!textOut) {
      const chunks: string[] = [];
      const output = Array.isArray(data.output) ? data.output : [];
      for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const c of content) {
          // Responses API often uses { type: "output_text", text: "..." }
          if (typeof c?.text === "string") chunks.push(c.text);
        }
      }
      textOut = chunks.join("\n").trim();
    }

    if (!textOut) return generateLocalReflection(cleaned, mem);

    let parsed: any;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      return generateLocalReflection(cleaned, mem);
    }

    const mirror = typeof parsed.mirror === "string" ? parsed.mirror.trim() : "";
    const question =
      parsed.question === null
        ? undefined
        : typeof parsed.question === "string"
        ? parsed.question.trim()
        : undefined;

    const nudges =
      parsed.nudges === null
        ? undefined
        : Array.isArray(parsed.nudges)
        ? parsed.nudges
            .filter((x: any) => typeof x === "string")
            .map((x: string) => x.trim())
            .filter(Boolean)
            .slice(0, 3)
        : undefined;

    if (!mirror) return generateLocalReflection(cleaned, mem);

    return { mode: "enhanced", mirror: ensureSafetyNote(mirror, cleaned), question, nudges };
  } catch {
    return generateLocalReflection(cleaned, mem);
  } finally {
    window.clearTimeout(timeout);
  }
}
