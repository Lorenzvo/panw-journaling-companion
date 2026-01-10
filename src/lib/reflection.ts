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
type Topic = "food" | "work" | "school" | "relationships" | "health" | "general";

function detectTone(text: string): Tone {
  const t = text.toLowerCase();

  const pos = /\b(happy|excited|grateful|proud|relieved|good|great|amazing|fun|nice|yummy|delicious|love|win|won)\b/.test(t);
  const neg = /\b(sad|down|anxious|panic|worry|angry|mad|overwhelm|exhausted|burnt|stress|frustrat|tired)\b/.test(t);

  if (pos && neg) return "mixed";
  if (pos) return "positive";
  if (neg) return "negative";

  // If it's not emotional, treat as neutral (logs, plans, notes)
  return "neutral";
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase();

  if (/\b(yummy|delicious|tasty|ate|food|dinner|lunch|breakfast|dessert|snack|restaurant)\b/.test(t)) return "food";
  if (/\b(boss|work|job|meeting|deadline|on-call|shift|coworker|manager)\b/.test(t)) return "work";
  if (/\b(homework|assignment|exam|quiz|class|school|study|professor)\b/.test(t)) return "school";
  if (/\b(friend|family|partner|relationship|dating|roommate)\b/.test(t)) return "relationships";
  if (/\b(sleep|rest|sick|headache|energy|gym|workout|run|walk)\b/.test(t)) return "health";

  return "general";
}

function maybeMemoryLine(mem: UserMemory | undefined, tone: Tone, topic: Topic): string | null {
  if (!mem) return null;

  // Show memory sometimes, but not constantly (good for demo without being spammy).
  const show = Math.random() < 0.33;
  if (!show) return null;

  // Prefer coping on negative/mixed days
  if ((tone === "negative" || tone === "mixed") && mem.coping.length) {
    return pick([
      `Tiny thing I’m remembering: you’ve said **${mem.coping[0]}** can help sometimes. Does that feel true today, or not really?`,
      `You’ve mentioned **${mem.coping[0]}** helping before — not as a fix, just as a small reset. Keep it as an option.`,
    ]);
  }

  // For positive entries, lightly reinforce wins/likes
  if (tone === "positive" && mem.likes.length) {
    return pick([
      `Also, you’ve mentioned you like **${mem.likes[0]}** — today feels a little in that same “simple good” lane.`,
      `This reminds me of what you said about **${mem.likes[0]}** — small joys count.`,
    ]);
  }

  // General fallback
  if (mem.wins.length && tone !== "negative") {
    return pick([
      `Small reminder: you’ve had wins like **${mem.wins[0]}** — you’re building a pattern.`,
      `You’ve been making progress in little ways (like **${mem.wins[0]}**).`,
    ]);
  }

  return null;
}

function localPositive(topic: Topic, memLine: string | null): ReflectionOutput {
  const mirror =
    topic === "food"
      ? pick([
          "Wait, that’s honestly a great kind of day. Good food can shift everything.",
          "I love this entry. Sometimes the journal is just: *life felt good for a second.*",
          "That’s such a clean win. You noticed a simple pleasure and actually let it land.",
        ])
      : pick([
          "That sounds like a quietly good day — the kind that doesn’t need analyzing.",
          "This feels like a breath of fresh air. Let yourself keep it simple.",
          "I’m glad you captured this. It’s easy to forget the good stuff if you don’t write it down.",
        ]);

  const mirror2 =
    topic === "food"
      ? pick([
          "If you want to make it even more vivid: what was the *best bite*?",
          "What was your favorite part — taste, texture, or just the vibe of eating it?",
          "It’s kind of nice when the bar is just “that was yummy.”",
        ])
      : pick([
          "What do you think made it work today?",
          "If you could bottle one part of today, what would you keep?",
          "This is the kind of entry that’s worth rereading later.",
        ]);

  // Positive entries often do NOT need a question.
  const includeQuestion = Math.random() < 0.45;
  const question = includeQuestion
    ? (topic === "food"
        ? pick([
            "What was the best thing you ate, specifically?",
            "Was it the food itself, or the moment around it, that felt good?",
          ])
        : pick([
            "What do you want to remember about today a month from now?",
            "What made this feel good — effort, luck, or a change in mindset?",
          ]))
    : undefined;

  const nudges = Math.random() < 0.35
    ? [
        topic === "food"
          ? "Write one line: “Today tasted like…”"
          : "Write one sentence of credit to yourself (even if it’s small).",
      ]
    : undefined;

  return {
    mode: "local",
    mirror: [mirror, mirror2, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

function localNegative(topic: Topic, memLine: string | null, text: string): ReflectionOutput {
  const mirror1 =
    topic === "work"
      ? pick([
          "That sounds exhausting in a very specific way — not just the hours, but the lack of notice.",
          "Oof. Last-minute work demands can feel like your time doesn’t matter.",
          "That’s draining. Especially when it collides with plans you already had.",
        ])
      : topic === "school"
      ? pick([
          "I hear the self-pressure in this. Deadlines can hit harder than they ‘should.’",
          "That sounds frustrating — and it’s easy to spiral when one task goes sideways.",
          "It makes sense this would feel heavy. School stress can be sneaky like that.",
        ])
      : pick([
          "That sounds like a lot to sit with.",
          "I’m really glad you wrote this down — this kind of day deserves a place to land.",
          "That feeling makes sense. You’re not being dramatic.",
        ]);

  const mirror2 = pick([
    "If we zoom in: what part stung the most — what happened, or what it *meant*?",
    "What I’m hearing is: you needed a break, and the day didn’t cooperate.",
    "This feels like one of those moments where you’re doing your best and still getting squeezed.",
  ]);

  const question =
    topic === "work"
      ? pick([
          "Do you feel more tired from the hours, or from the lack of control?",
          "If you could name the boundary that got crossed — was it time, notice, or respect?",
        ])
      : topic === "school"
      ? pick([
          "What got in the way — time estimate, focus, energy, or something unexpected?",
          "Was the hardest part starting, staying consistent, or finishing?",
        ])
      : pick([
          "What would feel like a *tiny* relief tonight — even 5%?",
          "What do you wish someone understood about how this feels?",
        ]);

  // Optional nudges (not always)
  const nudges =
    Math.random() < 0.55
      ? pick([
          [
            "Write 2 bullets: what you can control vs what you can’t.",
            "Finish: “What I needed in that moment was…”",
          ],
          [
            "Name one feeling + one need (example: ‘frustrated + rest’).",
            "Write one sentence you’d say to a friend in the same situation.",
          ],
          [
            "If you want, list 2 options for tomorrow that would make things 10% easier.",
          ],
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

  const topicLine =
    topic === "food"
      ? "Also: yes. Good food is a real event."
      : topic === "health"
      ? "Even small notes about energy/sleep help you notice patterns later."
      : null;

  const includeQuestion = Math.random() < 0.25;
  const question = includeQuestion
    ? pick([
        "Anything you want to add — one detail that makes this feel more like today?",
        "If you had to add one emotion to this entry, what would it be?",
      ])
    : undefined;

  return {
    mode: "local",
    mirror: [mirror, topicLine, memLine].filter(Boolean).join("\n\n"),
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

  if (tone === "positive") return localPositive(topic, memLine);
  if (tone === "negative" || tone === "mixed") return localNegative(topic, memLine, cleaned);
  return localNeutral(topic, memLine);
}

/**
 * Enhanced reflection via OpenAI Responses API.
 * In production, proxy this through a server so you don't ship the key to the client. (Vite exposes VITE_ vars to the browser.) :contentReference[oaicite:0]{index=0}
 */
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

Hard rules:
- Do NOT use a rigid structure every time. Vary your rhythm and length.
- Do NOT paraphrase their whole entry or say "You wrote:". Only quote a tiny phrase if it's genuinely helpful.
- Don't default to "good job writing this down" or therapy clichés.
- Don't assume the entry is negative. If it’s positive, celebrate lightly.
- It is OK to respond with only 2–3 sentences.
- Question is optional. Nudges are optional. Sometimes the best response is just witnessing + one gentle line.
- If you use memory, do it naturally and not every time.

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

Guidance:
- mirror: 2–5 short paragraphs max (or 2–3 sentences if that fits)
- question: null if not needed
- nudges: null if not needed
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
      max_output_tokens: 550,
    }),
  });

  if (!res.ok) return generateLocalReflection(cleaned, mem);

  const data = await res.json();

  // Best-effort extraction: find first JSON object
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
  const question =
    parsed.question === null ? undefined : (typeof parsed.question === "string" ? parsed.question : undefined);
  const nudges =
    parsed.nudges === null
      ? undefined
      : Array.isArray(parsed.nudges)
      ? parsed.nudges.filter((x: any) => typeof x === "string").slice(0, 3)
      : undefined;

  if (!mirror) return generateLocalReflection(cleaned, mem);

  return { mode: "enhanced", mirror, question, nudges };
}
