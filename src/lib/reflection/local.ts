import type { UserMemory } from "../../types/memory";
import type { ReflectionOutput } from "./types";
import { ensureSafetyNote, looksLikeGibberish, normalize, pick } from "./shared";
import {
  detectComparisonBehind,
  detectConflictAvoidance,
  detectDatingFatigue,
  detectFamilyTension,
  detectFriendLowBandwidth,
  detectGoodNothingNew,
  detectLonelyEvenWithPeople,
  detectMoneyAffectingRelationships,
  detectPatternSeeking,
  detectPositiveWinCategory,
  detectRelationshipAsEscape,
  detectRomanticUncertainty,
  detectSocialAvoidanceSpiral,
  detectSolitudeVsIsolation,
  detectTone,
  detectTopic,
  detectTooTired,
  detectUnwindIntent,
} from "./detect";
import { maybeMemoryLine } from "./memory";
import { parseGuidedSession } from "./guided";
import { localUnwindDecompress, localPatternInsight } from "./local/archetypes";
import {
  localComparisonBehind,
  localConflictAvoidance,
  localDatingFatigue,
  localFamilyTension,
  localFriendLowBandwidth,
  localLoneliness,
  localMoneyAffectingRelationships,
  localRelationshipAsEscape,
  localRelationships,
  localRelationshipsPositive,
  localRomanticUncertainty,
  localSocialAvoidanceSpiral,
  localSolitudeVsIsolation,
} from "./local/relationships";
import {
  localAnxiety,
  localDecisions,
  localFinances,
  localFoodPositive,
  localGoodNothingNew,
  localHealthPositive,
  localMentalWellness,
  localNewToJournaling,
  localSelfWorth,
  localTooTired,
} from "./local/general";
import { localWins, localHobbyJoy } from "./local/wins";
import { localWorkStress } from "./local/work";
import { localGuidedSession } from "./local/guidedResponse";

export function generateLocalReflection(entryText: string, mem?: UserMemory): ReflectionOutput {
  const cleaned = normalize(entryText);

  const finalize = (out: ReflectionOutput, safetyText: string) => ({
    ...out,
    mirror: ensureSafetyNote(out.mirror, safetyText),
  });

  // Guided Sessions: reflect from the user's answers (not the prompt text).
  const guided = parseGuidedSession(cleaned);
  if (guided) {
    const guidedAnswers = guided.qa.map((x) => normalize(x.a)).filter(Boolean);
    const answerOnly = normalize(guidedAnswers.join(" "));

    // If answers are basically placeholders ("a", "?", etc.), prompt for one real sentence.
    const tokens = answerOnly.split(" ").filter(Boolean);
    const allSingleChar = tokens.length > 0 && tokens.every((t) => t.length === 1);
    if (allSingleChar) {
      const out: ReflectionOutput = {
        mode: "local",
        mirror: pick([
          "I’m here — I only got tiny placeholder answers, so I can’t reflect back much yet.",
          "I caught the structure of the session, but the answers look like placeholders. Want to add one real sentence?",
        ]),
        question: pick([
          "Which prompt is easiest to answer with one honest sentence?",
          "Want to expand just one answer — the one that feels most real right now?",
        ]),
        nudges: pick([
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
        ]),
      };

      return finalize(out, answerOnly || cleaned);
    }

    const guidedTone = detectTone(answerOnly);
    const guidedTopic = detectTopic(answerOnly);
    const guidedMemLine = maybeMemoryLine(mem, answerOnly || cleaned, guidedTone, guidedTopic);
    const out = localGuidedSession(guided, guidedMemLine);
    return finalize(out, answerOnly || cleaned);
  }

  if (looksLikeGibberish(cleaned)) {
    const out: ReflectionOutput = {
      mode: "local",
      mirror:
        "I’m here. That looks super short (or maybe a key-smash).\n\nIf you want, give me **one more sentence** — what happened today, or what you’re feeling right now.",
      question: "Do you want to write about your day, your mood, or one specific moment?",
      nudges: ["Finish: “Right now I feel…”", "Finish: “What’s on my mind is…”"],
    };
    return finalize(out, cleaned);
  }

  // “I’m too tired” handling: keep it tiny and non-demanding.
  if (detectTooTired(cleaned)) {
    return finalize(localTooTired(), cleaned);
  }

  const tone = detectTone(cleaned);
  const topic = detectTopic(cleaned);
  const memLine = maybeMemoryLine(mem, cleaned, tone, topic);

  // Archetype: unwind / destress / colliding thoughts
  if ((tone === "negative" || tone === "mixed" || tone === "neutral") && detectUnwindIntent(cleaned)) {
    return finalize(localUnwindDecompress(cleaned, memLine), cleaned);
  }

  // Archetype: pattern-seeking (applies even if the topic classifier doesn't catch it)
  if (detectPatternSeeking(cleaned)) {
    return finalize(localPatternInsight(cleaned, memLine), cleaned);
  }

  if (tone === "positive" && detectGoodNothingNew(cleaned)) {
    return finalize(localGoodNothingNew(memLine), cleaned);
  }

  if (topic === "new_to_journaling") return finalize(localNewToJournaling(cleaned, memLine), cleaned);
  if (topic === "mental_wellness") return finalize(localMentalWellness(cleaned, memLine), cleaned);
  if (topic === "self_worth") {
    return finalize(localSelfWorth(cleaned, memLine), cleaned);
  }
  if (topic === "finances" && (tone === "negative" || tone === "mixed")) {
    if (detectMoneyAffectingRelationships(cleaned)) {
      return finalize(localMoneyAffectingRelationships(memLine), cleaned);
    }
    return finalize(localFinances(cleaned, memLine), cleaned);
  }
  if (topic === "relationships" && tone === "positive") return finalize(localRelationshipsPositive(cleaned, memLine), cleaned);
  if (topic === "relationships") {
    if (detectSocialAvoidanceSpiral(cleaned)) {
      return finalize(localSocialAvoidanceSpiral(cleaned, memLine), cleaned);
    }
    if (detectFamilyTension(cleaned)) {
      return finalize(localFamilyTension(memLine), cleaned);
    }
    if (detectFriendLowBandwidth(cleaned)) {
      return finalize(localFriendLowBandwidth(memLine), cleaned);
    }
    if (detectDatingFatigue(cleaned)) {
      return finalize(localDatingFatigue(memLine), cleaned);
    }
    if (detectRomanticUncertainty(cleaned)) {
      return finalize(localRomanticUncertainty(memLine), cleaned);
    }
    if (detectLonelyEvenWithPeople(cleaned)) {
      return finalize(localLoneliness(memLine), cleaned);
    }
    if (detectSolitudeVsIsolation(cleaned)) {
      return finalize(localSolitudeVsIsolation(memLine), cleaned);
    }
    if (detectComparisonBehind(cleaned)) {
      return finalize(localComparisonBehind(memLine), cleaned);
    }
    if (detectConflictAvoidance(cleaned)) {
      return finalize(localConflictAvoidance(memLine), cleaned);
    }
    if (detectRelationshipAsEscape(cleaned)) {
      return finalize(localRelationshipAsEscape(memLine), cleaned);
    }

    return finalize(localRelationships(cleaned, memLine), cleaned);
  }
  if (topic === "decisions") return finalize(localDecisions(memLine), cleaned);
  if (topic === "anxiety_rumination") return finalize(localAnxiety(cleaned, memLine), cleaned);
  if (topic === "wins_gratitude") return finalize(localWins(cleaned, memLine), cleaned);

  if (topic === "food" && tone === "positive") return finalize(localFoodPositive(cleaned, memLine), cleaned);

  if (topic === "health" && tone === "positive") return finalize(localHealthPositive(cleaned, memLine), cleaned);

  if (topic === "work" && (tone === "negative" || tone === "mixed")) return finalize(localWorkStress(cleaned, memLine), cleaned);

  // Positive hobby/joy entries (piano, art, skating, etc.) deserve richer local reflections.
  if (tone === "positive" && detectPositiveWinCategory(cleaned) === "hobby") {
    return finalize(localHobbyJoy(cleaned, memLine), cleaned);
  }

  if (tone === "positive") {
    const short = cleaned.length < 40;
    const hasWorkSignals = /\b(deadline|deadlines|meeting|meetings|client|boss|work|coworker|coworkers|overtime|workload|time isn'?t mine|time isnt mine)\b/.test(
      cleaned
    );
    const hasPeopleSignals = /\b(friend|friends|coworker|coworkers|partner|family|lunch|talk|chat|hang out|hung out)\b/.test(
      cleaned
    );
    const hasReliefSignals = /\b(for a bit|break|breathe|relief|reset|lighter|easy|easier|calm|calmer|nice|good)\b/.test(
      cleaned
    );

    const detailLine = (() => {
      if (hasWorkSignals && hasPeopleSignals) return "It reads like you got a pocket of connection and relief inside the work noise.";
      if (hasWorkSignals && hasReliefSignals) return "Even with work in the background, you got a moment that felt steadier and more like yours.";
      if (hasPeopleSignals) return "Connection is doing something real for you here — it shifts the tone, not just the schedule.";
      if (hasReliefSignals) return "That kind of ease is worth noticing. It’s information.";
      return null;
    })();
    const out: ReflectionOutput = short
      ? {
          mode: "local",
          mirror: [
            pick([
              "That sounds like a small win, and it counts.",
              "Nice. Even a simple “good” day deserves a little space.",
              "I’m glad there was something good in there.",
            ]),
            detailLine,
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
            detailLine,
            memLine,
          ]
            .filter(Boolean)
            .join("\n\n"),
          question: Math.random() < 0.3 ? "What part do you want to remember most?" : undefined,
        };

    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  if (tone === "negative" || tone === "mixed") {
    const hasWorkSignals = /\b(deadline|deadlines|meeting|meetings|client|boss|work|coworker|coworkers|overtime|workload|time isn'?t mine|time isnt mine)\b/.test(
      cleaned
    );
    const hasRelationshipSignals = /\b(friend|friends|partner|relationship|family|mom|dad|sister|brother)\b/.test(cleaned);
    const hasTimeSqueeze = /\b(no time|back to back|all day|didn'?t even|get time to|time isn'?t mine|time isnt mine)\b/.test(
      cleaned
    );

    const detailLine = (() => {
      if (hasWorkSignals && hasTimeSqueeze) return "It feels less like one bad moment and more like relentless demand on your time.";
      if (hasWorkSignals) return "Work pressure is sitting on this pretty heavily.";
      if (hasRelationshipSignals) return "The people side of this feels tender and complicated, not simple.";
      if (hasTimeSqueeze) return "The time squeeze itself reads like the sharp edge here.";
      return "It sounds like a lot is stacking at once.";
    })();
    const out: ReflectionOutput = {
      mode: "local",
      mirror: [
        pick([
          "That sounds heavy — and it makes sense you’d feel weighed down by it.",
          "I hear how much this is taking out of you.",
          "That’s a lot to carry at once.",
        ]),
        detailLine,
        memLine,
      ]
        .filter(Boolean)
        .join("\n\n"),
      question: pick([
        "What feels like the sharpest part of it right now — the situation, the feeling, or what it’s making you tell yourself?",
        "If you could get relief in one area tonight, where would you want it first?",
      ]),
      nudges:
        Math.random() < 0.55
          ? pick([
              ["Finish: ‘What I needed was ___.’"],
              ["Two bullets: what’s in your control / what isn’t."],
              ["One tiny next step (even 2 minutes): ___."],
            ])
          : undefined,
    };
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  // neutral fallback
  const hasWorkSignals = /\b(deadline|deadlines|meeting|meetings|client|boss|work|coworker|coworkers|overtime|workload|time isn'?t mine|time isnt mine)\b/.test(
    cleaned
  );
  const hasRelationshipSignals = /\b(friend|friends|partner|relationship|family|mom|dad|sister|brother)\b/.test(cleaned);
  const out: ReflectionOutput = {
    mode: "local",
    mirror: [
      pick(["Got it. I’m here with you.", "Okay. I’m with you."]),
      hasWorkSignals
        ? "If you want, we can zoom in on what about work is most draining — time, expectations, or pace."
        : hasRelationshipSignals
        ? "If you want, we can zoom in on the people part — what you needed, and what you got instead."
        : "If you want, we can zoom in on the one piece that felt most important today.",
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n"),
    question:
      Math.random() < 0.45
        ? pick([
            "Want to add one detail that makes this feel more like today?",
            "What’s the one part you’d want future-you to remember about this day?",
          ])
        : undefined,
    nudges: Math.random() < 0.2 ? ["You can keep it simple: Today felt ___ because ___."] : undefined,
  };
  return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
}
