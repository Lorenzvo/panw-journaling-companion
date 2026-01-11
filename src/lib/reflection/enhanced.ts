import type { UserMemory } from "../../types/memory";
import type { ReflectionOutput } from "./types";
import {
  detectGoodNothingNew,
  detectPatternSeeking,
  detectTone,
  detectTooTired,
  detectTopic,
  detectUnwindIntent,
} from "./detect";
import { parseGuidedSession } from "./guided";
import { extractAnsweredDrainingPart, selectRelevantMemory } from "./memory";
import { ensureSafetyNote, looksLikeGibberish, looksLikeSelfHarm, normalize } from "./shared";
import { generateLocalReflection } from "./local";

export async function generateEnhancedReflection(entryText: string, mem?: UserMemory): Promise<ReflectionOutput> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const cleaned = normalize(entryText);

  if (!apiKey) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[Solace] Enhanced reflection disabled: missing VITE_OPENAI_API_KEY (falling back to local).");
    }
    return generateLocalReflection(cleaned, mem);
  }
  if (looksLikeGibberish(cleaned)) return generateLocalReflection(cleaned, mem);

  // Guided Sessions: analyze answers only (ignore prompt text).
  const guided = parseGuidedSession(cleaned);
  const guidedAnswers = guided ? guided.qa.map((x) => normalize(x.a)).filter(Boolean) : [];
  const answerOnly = guided ? normalize(guidedAnswers.join(" ")) : "";

  // If Guided Session answers are placeholders ("a a a"), fall back to local prompting.
  const tokens = answerOnly.split(" ").filter(Boolean);
  const allSingleChar = guided && tokens.length > 0 && tokens.every((t) => t.length === 1);
  if (guided && allSingleChar) return generateLocalReflection(cleaned, mem);

  const analysisText = guided ? answerOnly : cleaned;

  const tone = detectTone(analysisText);
  const topic = detectTopic(analysisText);
  const tooTiredIntent = detectTooTired(cleaned);
  const goodNothingNewIntent = detectGoodNothingNew(cleaned);

  const unwindIntent = detectUnwindIntent(analysisText);
  const patternIntent = detectPatternSeeking(analysisText);

  const relevantMemory = selectRelevantMemory(mem, analysisText, tone, topic, { unwind: unwindIntent, pattern: patternIntent });

  const memoryContext = mem
    ? {
        coping: mem.coping.slice(0, 5),
        likes: mem.likes.slice(0, 5),
        hobbies: mem.hobbies.slice(0, 5),
        people: mem.people.slice(0, 5),
        stressors: mem.stressors.slice(0, 5),
        wins: mem.wins.slice(0, 5),
      }
    : { coping: [], likes: [], hobbies: [], people: [], stressors: [], wins: [] };

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
- If detectedTopic is "wins_gratitude": respond warmly and specifically. Name why it matters, reinforce the user’s agency (what they did), and offer 1 concrete encouragement. Optional: 1 gentle follow-up question.
- If detectedTopic is "general" and tone is neutral: keep it light, but still respond to what they actually said (no template filler).
`.trim();

  const prompt = `
You are a journaling companion that feels HUMAN and conversational — like a thoughtful friend who listens well.
The user wants something they could use long-term, not a template.

Critical rules:
- DO NOT invent details, phrases, or vibes the user didn’t say.
- Do NOT quote the user or say “You wrote:”.
- Avoid therapy clichés unless truly appropriate.
- Mirror should be 4–10 sentences, and must include at least 1 specific, grounded detail from the entry (paraphrase, don’t quote).
- Enhanced should feel noticeably more personal than the local mode: if Relevant memory hints include something that matches the entry, weave in ONE gentle callback (not random, not a list).
- If you reference a person from memory: only do so when the entry is clearly about relationships (or directly mentions them), and don’t assume specifics about the relationship.
- If you reference a hobby from memory: only do so as an optional “soft landing” suggestion when the entry is about unwinding/decompressing (or directly mentions it).
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
- intentUnwindDecompress: ${unwindIntent}
- intentPatternSeeking: ${patternIntent}
- memory: ${JSON.stringify(memoryContext)}
- Relevant memory hints (use if they fit naturally; ignore if not relevant): ${JSON.stringify(relevantMemory)}

User entry:
${guided ? `Guided session mode: ${guided.modeTitle}\nAnswers only (no prompt text):\n${answerOnly}` : cleaned}

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
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[Solace] Calling OpenAI Responses API for enhanced reflection...");
    }
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

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[Solace] OpenAI response status: ${res.status}`);
    }

    if (!res.ok) {
      if (import.meta.env.DEV) {
        let detail = "";
        try {
          const err = (await res.json()) as unknown;
          const errObj = err && typeof err === "object" ? (err as Record<string, unknown>) : null;
          const inner = errObj?.error && typeof errObj.error === "object" ? (errObj.error as Record<string, unknown>) : null;
          const msg = typeof inner?.message === "string" ? inner.message : "";
          const code = typeof inner?.code === "string" ? inner.code : "";
          const type = typeof inner?.type === "string" ? inner.type : "";
          detail = [type, code, msg].filter(Boolean).join(" | ");
        } catch {
          try {
            detail = (await res.text()).slice(0, 400);
          } catch {
            detail = "";
          }
        }

        const hint =
          res.status === 429
            ? "429 usually means rate-limited or out of quota/billing. Check the response body in DevTools and your OpenAI billing/usage limits."
            : "";

        // eslint-disable-next-line no-console
        console.warn(`[Solace] Enhanced reflection failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
        if (hint) {
          // eslint-disable-next-line no-console
          console.warn(`[Solace] ${hint}`);
        }
      }

      return generateLocalReflection(cleaned, mem);
    }

    const data = (await res.json()) as unknown;

    const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
    const arr = Array.isArray;

    // Most reliable: output_text if present
    const dataObj = obj(data);
    const outputText = dataObj?.output_text;
    const candidate = typeof outputText === "string" ? outputText.trim() : "";

    let textOut = candidate;

    // Fallback: traverse output blocks if output_text missing
    if (!textOut) {
      const chunks: string[] = [];
      const outputRaw = dataObj?.output;
      const output = arr(outputRaw) ? outputRaw : [];
      for (const item of output) {
        const itemObj = obj(item);
        const contentRaw = itemObj?.content;
        const content = arr(contentRaw) ? contentRaw : [];
        for (const c of content) {
          // Responses API often uses { type: "output_text", text: "..." }
          const cObj = obj(c);
          const t = cObj?.text;
          if (typeof t === "string") chunks.push(t);
        }
      }
      textOut = chunks.join("\n").trim();
    }

    if (!textOut) return generateLocalReflection(cleaned, mem);

    let parsed: unknown;
    try {
      parsed = JSON.parse(textOut) as unknown;
    } catch {
      return generateLocalReflection(cleaned, mem);
    }

    const parsedObj = obj(parsed);
    if (!parsedObj) return generateLocalReflection(cleaned, mem);

    const mirrorRaw = parsedObj.mirror;
    const mirror = typeof mirrorRaw === "string" ? mirrorRaw.trim() : "";
    const question =
      parsedObj.question === null ? undefined : typeof parsedObj.question === "string" ? parsedObj.question.trim() : undefined;

    const nudges =
      parsedObj.nudges === null
        ? undefined
        : Array.isArray(parsedObj.nudges)
        ? parsedObj.nudges
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
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
