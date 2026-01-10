import type { UserMemory } from "../types/memory";

export type ReflectionOutput = {
  mirror: string;
  question?: string; // optional now
  nudges?: string[]; // optional now
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
type Topic = "food" | "work" | "school" | "relationships" | "health" | "new_to_journaling" | "mental_wellness" | "general";

function detectTone(text: string): Tone {
  const t = text.toLowerCase();

  const pos = /\b(happy|excited|grateful|proud|relieved|good|great|amazing|fun|nice|love|win|won)\b/.test(t);
  const neg = /\b(sad|down|anxious|panic|worry|angry|mad|overwhelm|exhausted|burnt|stress|frustrat|tired|avoid)\b/.test(t);

  if (pos && neg) return "mixed";
  if (pos) return "positive";
  if (neg) return "negative";

  return "neutral";
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase();

  // New to journaling / onboarding
  if (/\b(where do i start|how do i start|new to journaling|dont know where to start|i don'?t know where to start)\b/.test(t)) {
    return "new_to_journaling";
  }

  // Mental wellness / patterns
  if (/\b(mental health|state of mind|anger|attachment|childhood trauma|trauma|avoidant|anxious|pattern|why am i like this)\b/.test(t)) {
    return "mental_wellness";
  }

  if (/\b(ate|eating|dinner|lunch|breakfast|restaurant|food)\b/.test(t)) return "food";
  if (/\b(boss|work|job|meeting|deadline|on-call|shift|coworker|manager|client)\b/.test(t)) return "work";
  if (/\b(homework|assignment|exam|quiz|class|school|study|professor)\b/.test(t)) return "school";
  if (/\b(friend|friends|family|partner|relationship|dating|roommate)\b/.test(t)) return "relationships";
  if (/\b(sleep|rest|sick|headache|energy|gym|workout|run|walk)\b/.test(t)) return "health";

  return "general";
}

function maybeMemoryLine(mem: UserMemory | undefined, tone: Tone, topic: Topic): string | null {
  if (!mem) return null;

  // Demo-friendly but not spammy
  const show = Math.random() < 0.33;
  if (!show) return null;

  if ((tone === "negative" || tone === "mixed") && mem.coping.length) {
    return pick([
      `Small thing I’m remembering: you’ve said **${mem.coping[0]}** can help sometimes. Does that feel true today, or not really?`,
      `You’ve mentioned **${mem.coping[0]}** helping before — not as a fix, just as a small reset. Keep it as an option.`,
    ]);
  }

  if (tone === "positive" && mem.likes.length) {
    return pick([
      `This kind of reminds me of what you said about **${mem.likes[0]}** — those “simple good” moments matter.`,
      `Tiny callback: you’ve mentioned you like **${mem.likes[0]}** — today has a similar calm vibe.`,
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

function localPositive(text: string, topic: Topic, memLine: string | null): ReflectionOutput {
  const lower = text.toLowerCase();
  const hasFriends = /\bfriends?\b/.test(lower);
  const hasEat = /\b(ate|eating|restaurant|dinner|lunch)\b/.test(lower);

  // IMPORTANT: never inject "yummy/delicious" unless user said it
  const mirror1 = hasFriends
    ? pick([
        "That sounds genuinely nice — catching up with friends can be one of those quiet resets.",
        "Aw, that’s a good kind of day. It’s easy to forget how much a friend catch-up can refill you.",
        "Love this. It sounds like you needed that time with people who feel familiar.",
      ])
    : pick([
        "That sounds like a quietly good day — the kind that doesn’t need analyzing.",
        "This feels like a breath of fresh air. Let yourself keep it simple.",
        "I’m glad you captured this. It’s easy to forget the good stuff if you don’t write it down.",
      ]);

  const mirror2 =
    hasEat && hasFriends
      ? pick([
          "Also: going out to eat is such an underrated way to reconnect. The ‘doing something’ makes talking easier.",
          "There’s something about sharing a meal that makes it feel real again.",
          "That kind of simple plan is honestly a win: people + food + no pressure.",
        ])
      : hasEat
      ? pick([
          "A good meal can change the whole texture of a day.",
          "Sometimes the journal is just: I took care of myself a little.",
          "I like that you noticed the day felt good without forcing it to be deep.",
        ])
      : pick([
          "If you want, you could write one detail you don’t want to forget.",
          "This feels like something future-you would be happy to reread.",
          "Let this one count. You’re allowed to have a good day and just… keep it.",
        ]);

  // Positive entries often do NOT need a question
  const includeQuestion = Math.random() < 0.35;
  const question = includeQuestion
    ? (hasFriends
        ? pick([
            "What was the best part — the people, the conversation, or just feeling connected again?",
            "Did anything surprise you about how it felt to see them again?",
          ])
        : pick([
            "What do you want to remember about today a month from now?",
            "What helped today feel better than usual?",
          ]))
    : undefined;

  const nudges = Math.random() < 0.25
    ? pick([
        ["Write one line: “Today felt like…”"],
        ["Save one tiny detail (a quote, a place, a moment)."],
      ])
    : undefined;

  return {
    mode: "local",
    mirror: [mirror1, mirror2, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

function localNewToJournaling(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "You’re in the right place. You don’t need a perfect “starting point” — you just need a first sentence.",
    "Totally normal to not know where to start. Let’s make it easy and low-pressure.",
    "We can keep this simple. Think of this as a place to talk out loud, not a place to write well.",
  ]);

  const question = pick([
    "Do you want to start with what happened today, what you’re feeling, or what you’ve been carrying lately?",
    "If you had to pick one: are you here to vent, to understand patterns, or to calm down?",
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

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
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

  return {
    mode: "local",
    mirror: [mirror1, mirror2, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

function localNegative(text: string, topic: Topic, memLine: string | null): ReflectionOutput {
  const mirror1 =
    topic === "work"
      ? pick([
          "That sounds exhausting in a very specific way — not just the workload, but how last-minute it all is.",
          "Oof. When work suddenly takes your time like that, it can feel like your life isn’t yours.",
          "That’s draining. Especially when it collides with plans and rest you were counting on.",
        ])
      : pick([
          "That sounds like a lot to sit with.",
          "I’m really glad you put this somewhere — this kind of day deserves a place to land.",
          "That makes sense. You’re not being dramatic.",
        ]);

  const mirror2 =
    topic === "work"
      ? pick([
          "I’m hearing two layers: the schedule stress, and the feeling of your time not being respected.",
          "It’s not just the tasks — it’s the constant “drop everything” energy.",
        ])
      : pick([
          "If we zoom in: what part stung the most — what happened, or what it *meant*?",
          "It sounds like you needed a break, and the day didn’t cooperate.",
        ]);

  const question =
    topic === "work"
      ? pick([
          "Do you feel more tired from the hours, or from the lack of control?",
          "If you had to name the boundary that got crossed — time, notice, or respect?",
        ])
      : pick([
          "What would feel like a *tiny* relief tonight — even 5%?",
          "What do you wish someone understood about how this feels?",
        ]);

  const nudges = Math.random() < 0.55
    ? pick([
        [
          "Write 2 bullets: what you can control vs what you can’t.",
          "Finish: “What I needed in that moment was…”",
        ],
        [
          "Name one feeling + one need (example: ‘frustrated + rest’).",
          "Write one sentence you’d say to a friend in the same situation.",
        ],
        ["If you want, list 2 changes that would make work feel 10% more sustainable."],
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

function localNeutral(topic: Topic, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Not every entry needs to be deep — I like that you captured this.",
    "This feels like a simple check-in. That’s valid journaling too.",
    "Low-stakes entries are underrated. They keep the habit alive.",
  ]);

  const includeQuestion = Math.random() < 0.2;
  const question = includeQuestion
    ? pick([
        "Want to add one detail that makes this feel more like today?",
        "If you had to add one emotion to this entry, what would it be?",
      ])
    : undefined;

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges: undefined,
  };
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

  if (tone === "positive") return localPositive(cleaned, topic, memLine);
  if (tone === "negative" || tone === "mixed") return localNegative(cleaned, topic, memLine);

  return localNeutral(topic, memLine);
}

export async function generateEnhancedReflection(entryText: string, mem?: UserMemory): Promise<ReflectionOutput> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const cleaned = normalize(entryText);

  if (!apiKey) return generateLocalReflection(cleaned, mem);
  if (looksLikeGibberish(cleaned)) return generateLocalReflection(cleaned, mem);

  const tone = detectTone(cleaned);
  const topic = detectTopic(cleaned);

  const safetyHint = looksLikeSelfHarm(cleaned)
    ? "If the entry implies self-harm or suicide intent, include a short supportive note and encourage reaching local crisis resources; in the U.S. mention 988. Do not be alarmist."
    : "Avoid medical claims. Don’t diagnose.";

  const memoryContext = mem
    ? {
        coping: mem.coping.slice(0, 5),
        likes: mem.likes.slice(0, 5),
        stressors: mem.stressors.slice(0, 5),
        wins: mem.wins.slice(0, 5),
      }
    : { coping: [], likes: [], stressors: [], wins: [] };

  const prompt = `
You are a journaling companion that feels HUMAN and conversational — like a thoughtful friend who listens well.
The user wants something they could use long-term, not a template.

Critical rule:
- DO NOT invent details, phrases, or vibes that the user did not say.
  (Example: if they said "went out to eat", don't say "yummy/delicious" unless they used those words.)
- Do NOT paraphrase their whole entry or say "You wrote:".
- Avoid therapy clichés like "good job writing this down" unless truly appropriate.
- It’s OK for the response to be only 2–3 sentences.
- Question and nudges are optional and can be null.
- If using memory, mention it naturally and not every time.

${safetyHint}

Context:
- detectedTone: ${tone}
- detectedTopic: ${topic}
- memory: ${JSON.stringify(memoryContext)}

User entry:
${cleaned}

Return JSON exactly:
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
      max_output_tokens: 600,
    }),
  });

  if (!res.ok) return generateLocalReflection(cleaned, mem);

  const data = await res.json();

  const raw = JSON.stringify(data);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return generateLocalReflection(cleaned, mem);

  let parsed: any;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
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
