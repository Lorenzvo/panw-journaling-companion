import type { UserMemory } from "../types/memory";

export type ReflectionOutput = {
  mirror: string;
  question: string;
  nudges: string[];
  mode: "local" | "enhanced";
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function snippet(text: string, max = 220) {
  const t = normalize(text);
  return t.length <= max ? t : t.slice(0, max).trim() + "…";
}

function detect(text: string) {
  const t = text.toLowerCase();

  const has = (re: RegExp) => re.test(t);

  return {
    schoolWork: has(/\b(homework|assignment|exam|quiz|deadline|class|school|study)\b/),
    work: has(/\b(work|job|meeting|boss|deadline|promotion|performance)\b/),
    relationships: has(/\b(friend|friends|partner|relationship|family|mom|dad|sister|brother)\b/),
    anxiety: has(/\b(anxious|panic|worry|spiral|overthink|nervous)\b/),
    sadness: has(/\b(sad|down|empty|hopeless|cry|lonely)\b/),
    anger: has(/\b(angry|mad|furious|annoyed|frustrat)\b/),
    overwhelmed: has(/\b(overwhelm|too much|burnt out|exhausted|drained|stuck)\b/),
    guilt: has(/\b(guilt|guilty|ashamed|should have|my fault)\b/),
    win: has(/\b(proud|went well|small win|i managed|progress|improved)\b/),
    copingWalk: has(/\bwalk(ed)?\b/),
    copingSleep: has(/\b(sleep|nap|rest)\b/),
    copingMusic: has(/\b(music|playlist|song)\b/),
    copingExercise: has(/\b(gym|workout|run|yoga|exercise)\b/),
  };
}

/** Basic safety detector for high-risk self-harm language */
function looksLikeSelfHarm(text: string) {
  const t = text.toLowerCase();
  return /(suicid|kill myself|end my life|self harm|hurt myself|i want to die)/.test(t);
}

function memoryCallback(mem?: UserMemory) {
  if (!mem) return null;

  // Prefer a coping callback, then wins.
  if (mem.coping.length) {
    const c = mem.coping[0];
    return `You’ve mentioned before that **${c}** can help a little—worth keeping in your back pocket.`;
  }
  if (mem.wins.length) {
    const w = mem.wins[0];
    return `Also, you’ve had moments like **${w}**—you’re capable of building momentum again.`;
  }
  return null;
}

export function generateLocalReflection(entryText: string, mem?: UserMemory): ReflectionOutput {
  const s = detect(entryText);
  const cb = memoryCallback(mem);
  const short = snippet(entryText);

  // 1) Validate + be specific (don’t just repeat the text)
  const validate = s.overwhelmed
    ? pick([
        "That sounds like a lot to carry at once.",
        "It makes sense that this would feel heavy today.",
      ])
    : s.anxiety
    ? pick([
        "It sounds like your brain has been running ahead of you a bit.",
        "That kind of worry can be exhausting—especially when it loops.",
      ])
    : s.sadness
    ? pick([
        "That sounds genuinely tough, and I’m glad you wrote it down.",
        "It makes sense this would feel painful—thank you for being honest here.",
      ])
    : s.anger
    ? pick([
        "I can hear the frustration in this.",
        "That would irritate most people—your reaction makes sense.",
      ])
    : s.guilt
    ? pick([
        "I hear some self-blame in this, and that can hit hard.",
        "It’s easy to be harsh on yourself here—especially when expectations are high.",
      ])
    : pick([
        "Thanks for writing this down—there’s something real here.",
        "I’m with you. Let’s slow it down together for a second.",
      ]);

  // 2) Notice something helpful / strength-based
  const noticing =
    s.copingWalk || s.copingExercise || s.copingMusic || s.copingSleep
      ? pick([
          "I also noticed you did something supportive for yourself—those small choices matter.",
          "And you didn’t just sit in it—you tried something that helped, even a little.",
        ])
      : s.win
      ? pick([
          "Also—credit where it’s due: there’s progress in here.",
          "I’m noticing something you handled better than you might be giving yourself credit for.",
        ])
      : pick([
          "Even putting words to it is a step toward clarity.",
          "Writing it out like this usually means you’re already processing.",
        ]);

  // 3) Tailored question (topic-aware, not invasive)
  let question = "If you zoom in on one moment today, what part felt the most emotionally “loud”?";
  if (s.schoolWork) {
    question = "What got in the way of finishing on time—time estimate, distraction, or low energy?";
  } else if (s.work) {
    question = "What part of work felt most draining—uncertainty, volume, or pressure to perform?";
  } else if (s.relationships) {
    question = "What do you wish the other person understood about your side of this?";
  } else if (s.anxiety) {
    question = "What’s the specific outcome you’re worried about, and what makes it feel likely right now?";
  } else if (s.sadness) {
    question = "What do you wish someone would *get* about how this feels?";
  } else if (s.overwhelmed) {
    question = "If you could reduce one thing by 10% tonight, what would you pick first?";
  }

  // 4) Tailored nudges (2–3, varied)
  const nudges: string[] = [];

  if (s.schoolWork) {
    nudges.push("Write one sentence: “Next time, I’ll start by…” (keep it tiny).");
    nudges.push("List 2 friction points that made this harder than expected.");
  } else if (s.relationships) {
    nudges.push("Finish this: “What I needed in that moment was…”");
    nudges.push("What boundary (even a small one) would protect your energy next time?");
  } else if (s.anxiety) {
    nudges.push("Separate facts vs stories: write 2 facts, then 1 story your mind is telling.");
    nudges.push("What’s one sign you’d be ‘okay’ even if it doesn’t go perfectly?");
  } else if (s.overwhelmed) {
    nudges.push("Brain dump 5 bullets—no full sentences.");
    nudges.push("Pick 1 small “next step” that takes under 5 minutes.");
  } else {
    nudges.push(pick([
      "Try finishing: “The hardest part is…”",
      "Try finishing: “What I really need right now is…”",
      "Try finishing: “I keep replaying…”",
    ]));
    nudges.push(pick([
      "Name one feeling (not a thought) and where you feel it in your body.",
      "Write 3 bullets: what happened / what it meant to you / what you want next.",
      "If this was your friend’s day, what would you say to them?",
    ]));
  }

  // If we noticed a coping tool, ask a gentle follow-up about it (feels personal)
  if (s.copingWalk) nudges.push("What did you like about the walk—movement, air, scenery, or quiet?");
  else if (s.copingMusic) nudges.push("What did the music do for you—distract, soothe, energize, or release?");
  else if (s.copingSleep) nudges.push("What would ‘better rest’ look like tonight—earlier bedtime, less scrolling, calmer routine?");
  else if (s.copingExercise) nudges.push("Did the movement help your mood, stress, or self-trust the most?");

  const safety =
    looksLikeSelfHarm(entryText)
      ? "If you’re feeling like you might hurt yourself, you deserve real-time support. If you’re in the U.S., you can call or text **988** (Suicide & Crisis Lifeline). If you’re elsewhere, I can help find local resources. If you’re in immediate danger, call your local emergency number."
      : null;

  const mirrorParts = [
    validate,
    `You wrote: “${short}”`,
    noticing,
    cb ? cb : null,
    safety ? safety : null,
  ].filter(Boolean);

  return {
    mirror: mirrorParts.join("\n\n"),
    question,
    nudges: nudges.slice(0, 3),
    mode: "local",
  };
}

/**
 * Enhanced reflection via OpenAI Responses API.
 * - Uses structured prompt, references memory, keeps tone "listener-first".
 * - For a real app: move this call to a server to protect your API key.
 */
export async function generateEnhancedReflection(
  entryText: string,
  mem?: UserMemory
): Promise<ReflectionOutput> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) {
    // fall back safely
    return generateLocalReflection(entryText, mem);
  }

  const safetyHint = looksLikeSelfHarm(entryText)
    ? "If the user indicates self-harm or suicide intent, respond with supportive language and encourage reaching out to local emergency resources; in the U.S. mention 988."
    : "Avoid medical claims. Be supportive. Don’t diagnose.";

  const memoryBullets = mem
    ? [
        mem.coping.length ? `Coping tools they’ve mentioned: ${mem.coping.slice(0, 5).join("; ")}` : null,
        mem.likes.length ? `Things they like: ${mem.likes.slice(0, 5).join("; ")}` : null,
        mem.stressors.length ? `Recurring stressors: ${mem.stressors.slice(0, 5).join("; ")}` : null,
        mem.wins.length ? `Wins/progress: ${mem.wins.slice(0, 5).join("; ")}` : null,
      ].filter(Boolean).join("\n")
    : "No prior memory.";

  const prompt = `
You are an empathetic journaling companion. Your job is to help the user have a conversation with themselves.
Style: warm, specific, not corny. Listener-first. You can offer gentle guidance, but do not jump to solutions unless the user asks.
Be hyperspecific to the user’s words. If they mention something helpful (like a walk), notice it and possibly suggest it later.
Use prior memory when relevant, but do not pretend to know things you were not given.

${safetyHint}

USER'S PRIOR MEMORY:
${memoryBullets}

USER'S JOURNAL ENTRY:
${entryText}

Return JSON with exactly:
{
  "mirror": string,        // 2-4 short paragraphs: validate + reflect specifics + notice something helpful + connect to memory if relevant
  "question": string,      // 1 gentle, non-invasive follow-up question tailored to the entry
  "nudges": string[]       // 2-3 short optional prompts to continue writing (varied, tailored)
}
Keep mirror under ~1200 chars. Keep nudges short.
`.trim();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o", // best quality for this use-case; swap to "gpt-4o-mini" if you want cheaper/faster
      input: prompt,
      // We want JSON back. We'll parse permissively if it wraps.
      max_output_tokens: 350,
    }),
  });

  if (!res.ok) {
    return generateLocalReflection(entryText, mem);
  }

  const data = await res.json();

  // Responses API returns content in a few possible shapes depending on SDK vs REST;
  // simplest robust approach: stringify + attempt JSON extraction.
  const rawText = JSON.stringify(data);
  const jsonStart = rawText.indexOf("{");
  const jsonEnd = rawText.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return generateLocalReflection(entryText, mem);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
  } catch {
    return generateLocalReflection(entryText, mem);
  }

  const mirror = typeof parsed.mirror === "string" ? parsed.mirror : null;
  const question = typeof parsed.question === "string" ? parsed.question : null;
  const nudges = Array.isArray(parsed.nudges) ? parsed.nudges.filter((x: any) => typeof x === "string") : null;

  if (!mirror || !question || !nudges?.length) {
    return generateLocalReflection(entryText, mem);
  }

  return { mirror, question, nudges: nudges.slice(0, 3), mode: "enhanced" };
}
