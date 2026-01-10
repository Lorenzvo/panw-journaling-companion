import type { UserMemory } from "../types/memory";

export type ReflectionOutput = {
  mirror: string;
  question?: string;
  nudges?: string[];
  mode: "local" | "enhanced";
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function looksLikeGibberish(text: string) {
  const t = normalize(text);
  if (t.length < 2) return true;

  const letters = (t.match(/[a-zA-Z]/g) ?? []).length;
  const ratio = letters / Math.max(1, t.length);

  const words = t.split(" ").filter(Boolean);
  if (t.length < 8 && words.length <= 1) return true;
  if (ratio < 0.45 && t.length < 18) return true;

  return false;
}

function looksLikeSelfHarm(text: string) {
  const t = text.toLowerCase();
  return /(suicid|kill myself|end my life|self harm|hurt myself|i want to die)/.test(t);
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

function detectTone(text: string): Tone {
  const t = text.toLowerCase();

  const pos =
    /\b(happy|excited|grateful|thankful|proud|relieved|good|great|amazing|fun|nice|love|win|won|blessed)\b/.test(
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

  // New to journaling
  if (
    /\b(where do i start|how do i start|dont know where to start|i don'?t know where to start|where should i even start|where should i start)\b/.test(
      t
    ) ||
    /\b(want(ing)? to document my thoughts)\b/.test(t) ||
    /\b(just want a place to start)\b/.test(t
    )
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
  if (/\b(boss|work|job|meeting|deadline|on-call|shift|coworker|manager|client|clients|call)\b/.test(t)) {
    return "work";
  }

  // Relationships
  if (
    /\b(friend|friends|family|partner|relationship|dating|breakup|lonely|alone|argue|fight|conflict|roommate)\b/.test(t)
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
  const show = Math.random() < 0.33;
  if (!show) return null;

  if ((tone === "negative" || tone === "mixed") && mem.coping.length) {
    return pick([
      `Small thing I’m remembering: you’ve said **${mem.coping[0]}** can help sometimes. Does that feel true today, or not really?`,
      `You’ve mentioned **${mem.coping[0]}** helping before — not as a fix, just as a small reset.`,
    ]);
  }

  if (tone === "positive" && mem.likes.length) {
    return pick([
      `Tiny callback: you’ve mentioned you like **${mem.likes[0]}** — today has a similar calm vibe.`,
      `This kind of reminds me of what you said about **${mem.likes[0]}** — small joys count.`,
    ]);
  }

  if (mem.wins.length && tone !== "negative") {
    return pick([
      `Small reminder: you’ve had wins like **${mem.wins[0]}** — you’re building a pattern.`,
      `You’ve been stacking small wins (like **${mem.wins[0]}**).`,
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

function localRelationships(text: string, memLine: string | null): ReflectionOutput {
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
    return {
      mode: "local",
      mirror:
        "I’m here. That looks super short (or maybe a key-smash).\n\nIf you want, give me **one more sentence** — what happened today, or what you’re feeling right now.",
      question: "Do you want to write about your day, your mood, or one specific moment?",
      nudges: ["Finish: “Right now I feel…”", "Finish: “What’s on my mind is…”"],
    };
  }

  const tone = detectTone(cleaned);
  const topic = detectTopic(cleaned);
  const memLine = maybeMemoryLine(mem, tone, topic);

  if (topic === "new_to_journaling") return localNewToJournaling(memLine);
  if (topic === "mental_wellness") return localMentalWellness(memLine);
  if (topic === "relationships") return localRelationships(cleaned, memLine);
  if (topic === "decisions") return localDecisions(memLine);
  if (topic === "anxiety_rumination") return localAnxiety(memLine);
  if (topic === "wins_gratitude") return localWins(memLine);

  if (topic === "food" && tone === "positive") return localFoodPositive(cleaned, memLine);

  if (topic === "work" && (tone === "negative" || tone === "mixed")) return localWorkStress(cleaned, memLine);

  if (tone === "positive") {
    // generic positive fallback
    return {
      mode: "local",
      mirror: ["That sounds like a good moment to keep.", memLine].filter(Boolean).join("\n\n"),
      question: Math.random() < 0.3 ? "What part do you want to remember most?" : undefined,
    };
  }

  if (tone === "negative" || tone === "mixed") {
    return {
      mode: "local",
      mirror: ["That sounds heavy. I’m here with you in it.", memLine].filter(Boolean).join("\n\n"),
      question: "What feels like the sharpest part of this?",
      nudges: Math.random() < 0.4 ? ["Write one sentence: “What I needed was…”"] : undefined,
    };
  }

  // neutral fallback
  return {
    mode: "local",
    mirror: ["Not every entry has to be deep — you showed up.", memLine].filter(Boolean).join("\n\n"),
    question: Math.random() < 0.2 ? "Want to add one detail that makes it feel more like today?" : undefined,
  };
}

export async function generateEnhancedReflection(entryText: string, mem?: UserMemory): Promise<ReflectionOutput> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const cleaned = normalize(entryText);

  if (!apiKey) return generateLocalReflection(cleaned, mem);
  if (looksLikeGibberish(cleaned)) return generateLocalReflection(cleaned, mem);

  const tone = detectTone(cleaned);
  const topic = detectTopic(cleaned);

  const memoryContext = mem
    ? {
        coping: mem.coping.slice(0, 5),
        likes: mem.likes.slice(0, 5),
        stressors: mem.stressors.slice(0, 5),
        wins: mem.wins.slice(0, 5),
      }
    : { coping: [], likes: [], stressors: [], wins: [] };

  const answeredHint = extractAnsweredDrainingPart(cleaned)
    ? "The entry includes a direct answer to a previous question (e.g., “the most draining part is…”). Acknowledge it and move forward—do not re-ask."
    : "No explicit answered-question patterns detected.";

  const safetyHint = looksLikeSelfHarm(cleaned)
    ? "If the entry implies self-harm or suicide intent, include a short supportive note and encourage reaching local crisis resources; in the U.S. mention 988. Do not be alarmist."
    : "Avoid medical claims. Don’t diagnose.";

  const prompt = `
You are a journaling companion that feels HUMAN and conversational — like a thoughtful friend who listens well.
The user wants something they could use long-term, not a template.

Critical rules:
- DO NOT invent details, phrases, or vibes the user didn’t say.
- Do NOT paraphrase the whole entry or say “You wrote:”.
- Avoid therapy clichés unless truly appropriate.
- It’s OK to respond in only 2–3 sentences.
- Question and nudges are optional and can be null.
- If the user already answers a question inside the entry, acknowledge it and build on it (don’t ignore it).
- If using memory, do it naturally and not every time.

Extra hint: ${answeredHint}
${safetyHint}

Context:
- detectedTone: ${tone}
- detectedTopic: ${topic}
- memory: ${JSON.stringify(memoryContext)}

User entry:
${cleaned}

Return ONLY JSON:
{
  "mirror": string,
  "question": string | null,
  "nudges": string[] | null
}
`.trim();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      input: prompt,
      max_output_tokens: 650,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) return generateLocalReflection(cleaned, mem);

  const data: any = await res.json();

  const chunks: string[] = [];
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") chunks.push(c.text);
    }
  }
  const textOut = chunks.join("\n").trim();
  if (!textOut) return generateLocalReflection(cleaned, mem);

  let parsed: any;
  try {
    parsed = JSON.parse(textOut);
  } catch {
    return generateLocalReflection(cleaned, mem);
  }

  const mirror = typeof parsed.mirror === "string" ? parsed.mirror : null;
  const question = parsed.question === null ? undefined : typeof parsed.question === "string" ? parsed.question : undefined;
  const nudges =
    parsed.nudges === null
      ? undefined
      : Array.isArray(parsed.nudges)
      ? parsed.nudges.filter((x: any) => typeof x === "string").slice(0, 3)
      : undefined;

  if (!mirror) return generateLocalReflection(cleaned, mem);

  return { mode: "enhanced", mirror, question, nudges };
}
