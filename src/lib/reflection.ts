function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  function cleanSnippet(text: string) {
    // Keep it short and human. Avoid sounding robotic.
    const t = text.trim().replace(/\s+/g, " ");
    if (t.length <= 180) return t;
    return t.slice(0, 180).trim() + "…";
  }
  
  function detectSignals(text: string) {
    const t = text.toLowerCase();
    return {
      overwhelmed: /(overwhelm|too much|can't|stuck|exhausted|burnt)/.test(t),
      anxious: /(anxious|panic|worry|nervous|spiral)/.test(t),
      sad: /(sad|down|empty|hopeless|cry)/.test(t),
      angry: /(angry|mad|furious|annoyed|frustrat)/.test(t),
      lonely: /(lonely|alone|isolated|no one)/.test(t),
      selfDoubt: /(i'm not|not good enough|hate myself|failure|worthless)/.test(t),
    };
  }
  
  export function generateLocalReflection(entryText: string) {
    const snippet = cleanSnippet(entryText);
    const s = detectSignals(entryText);
  
    // Mirror: reflect their words + emotional validation
    const mirrorBase = s.overwhelmed
      ? pick([
          "It sounds like you're carrying a lot right now.",
          "I’m hearing how heavy this feels today.",
        ])
      : s.anxious
      ? pick([
          "It sounds like your mind has been running ahead of you.",
          "I’m hearing a lot of worry in what you wrote.",
        ])
      : s.sad
      ? pick([
          "It sounds like today hit you in a painful way.",
          "I’m hearing some real sadness underneath this.",
        ])
      : s.angry
      ? pick([
          "It sounds like something really got under your skin.",
          "I’m hearing frustration that hasn’t had a place to go yet.",
        ])
      : s.lonely
      ? pick([
          "It sounds like you’ve been doing this alone lately.",
          "I’m hearing a sense of isolation in this.",
        ])
      : s.selfDoubt
      ? pick([
          "It sounds like you’ve been hard on yourself.",
          "I’m hearing self-doubt that’s been sticking around.",
        ])
      : pick([
          "I’m hearing a lot in what you wrote.",
          "Thanks for putting this into words—there’s something real here.",
        ]);
  
    const mirror = `${mirrorBase} You wrote: “${snippet}”`;
  
    // Question: listener-first, not advice
    const question = s.overwhelmed
      ? "If you zoom in on the last hour, what’s the one part that feels the most urgent?"
      : s.anxious
      ? "What’s the specific outcome you’re most afraid of, and what makes it feel likely right now?"
      : s.sad
      ? "What do you wish someone would understand about how this feels?"
      : s.angry
      ? "What boundary feels like it got crossed—or what felt unfair about it?"
      : s.lonely
      ? "When did you first notice the loneliness showing up this week?"
      : s.selfDoubt
      ? "Whose voice does that self-criticism sound like—and what would you say to a friend in the same spot?"
      : "What part of this feels most important to say out loud, even if it’s messy?";
  
    // Nudges: tiny prompts to keep writing
    const nudges = [
      pick([
        "Try finishing this sentence: “What I really need right now is…”",
        "Try finishing this sentence: “The hardest part is…”",
        "Try finishing this sentence: “I keep thinking about…”",
      ]),
      pick([
        "List 2 small facts about today (no interpretations).",
        "Name 1 thing you wish was different and why.",
        "Write 3 bullet points—no full sentences needed.",
      ]),
    ];
  
    return { mirror, question, nudges };
  }
  