import type { ReflectionOutput } from "../types";
import { extractAnchor, pick, softEcho } from "../shared";

export function localFamilyTension(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Calls like that can stick to you, even when nothing clearly ‘bad’ happened.",
    "It makes sense it lingered. Family dynamics can leave an aftertaste even when everything sounds polite on the surface.",
  ]);

  const mirror2 = pick([
    "That judged feeling isn’t always about the words. A tone shift, old history, or what you expect they’ll assume can do it.",
    "Sometimes it’s all subtext. Your body catches it before your brain can explain it.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, mirror2, memLine].filter(Boolean).join("\n\n"),
    question: "When you think about that conversation now, what part of it is still sitting with you?",
  };
}

export function localFriendLowBandwidth(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That doesn’t sound mean. It sounds like low bandwidth.",
    "This reads less like you don’t care and more like you’re stretched thin.",
  ]);

  const mirror2 = pick([
    "Irritability is often an early signal you need less input, not that your friends are doing something wrong.",
    "When you’re running on empty, normal social stuff can feel like too much noise.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, mirror2, memLine].filter(Boolean).join("\n\n"),
    question: "Do you feel more annoyed by them, or more drained in general right now?",
  };
}

export function localRomanticUncertainty(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That mix of excitement and anxiety is confusing, especially when you can’t point to a clear reason.",
    "It doesn’t automatically mean something’s wrong. It does mean there’s something worth paying attention to.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "When the anxiety shows up, does it feel more about them, or about how you feel around them?",
  };
}

export function localDatingFatigue(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Wanting connection while feeling worn down by the process is a really real tension.",
    "This reads less like hopelessness and more like you’re burnt out on the path to it.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "If dating wasn’t on the table at all right now, what kind of connection would you want instead?",
  };
}

export function localLoneliness(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That kind of loneliness can hit harder than being alone. You can talk to people and still feel unseen.",
    "Lonely while surrounded is its own kind of ache. There’s contact, but not closeness.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "Did it feel like you were missing closeness, understanding, or just quiet companionship?",
  };
}

export function localSolitudeVsIsolation(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That line between solitude and isolation can be subtle.",
    "Liking time alone doesn’t automatically mean anything is wrong. The question is whether it’s refilling you or slowly shrinking your world.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "What does being alone give you right now, and what does it take away?",
  };
}

export function localComparisonBehind(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That comparison can land quietly, but it still goes deep.",
    "Even when you know it’s not logical, it can still feel painfully real.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "When that feeling comes up, what story do you tell yourself about where you should be?",
  };
}

export function localConflictAvoidance(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That sounds like self-protection that’s starting to cost you.",
    "Avoidance can start as ‘keeping the peace’ and then turn into resentment later.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "What feels riskier right now: speaking up, or continuing to carry it quietly?",
  };
}

export function localRelationshipAsEscape(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That’s a really honest thing to notice.",
    "Wanting connection and wanting escape can overlap more than most people admit out loud.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "When you imagine being there for yourself, what feels hardest about that?",
  };
}

export function localMoneyAffectingRelationships(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Money stress has a way of leaking into everything, especially your patience.",
    "It makes sense it’s affecting how you show up with people. Living tense all the time is exhausting.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "If the money stress eased even a little, what do you think would feel different socially?",
  };
}

export function localSocialAvoidanceSpiral(text: string, memLine: string | null): ReflectionOutput {
  const t = text.toLowerCase();
  const openerDetail = /\bignored|ignoring|ghost|left on read\b/.test(t)
    ? "You’re not being mean. You’re trying to conserve energy, and it’s turning into avoidance."
    : "You’re not being mean. You’re running low on energy, and replying starts to feel harder than it should.";

  const mirror = pick([
    `That’s a very real spiral. You care about people, but you don’t have the energy to talk. Then the silence starts to feel heavier, which makes replying even harder.\n\n${openerDetail}`,
    `This doesn’t read like indifference. It reads like low capacity. When you’re running low, even texting can feel like a task, and then the guilt makes it snowball.\n\n${openerDetail}`,
  ]);

  const question = pick([
    "What would be the smallest honest message you could send that doesn’t overpromise? Just enough to break the spiral.",
    "Is there one friend you’d feel safest replying to first, the one who won’t make you explain?",
  ]);

  const nudges = pick([
    [
      "Copy/paste option: Hey, I’ve been low energy and I’ve been slow to reply. I care about you. No need to respond fast.",
      "Or: I’m not ignoring you. I’m just wiped. I’ll circle back when I’ve got more bandwidth.",
    ],
    [
      "If you can do 10%: send one emoji + a quick ‘thinking of you’ to reopen the door.",
      "Then set a tiny boundary: I’m not up for a convo tonight, but I wanted to reply.",
    ],
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

export function localRelationshipsPositive(_text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(_text, 150);
  const mirror = pick([
    "That sounds like a genuinely good connection moment, the kind that quietly refills you.",
    "I’m glad there was something warm here. Relationship stuff can be heavy, so lighter moments matter.",
    "That reads like closeness that actually felt steady. That’s worth marking.",
  ]);

  const question = pick([
    "What part of it felt most grounding: the conversation, the vibe, or feeling understood?",
    "Did it give you energy, or more of a calm?",
  ]);

  const nudges = Math.random() < 0.35 ? ["Optional: write one line you’d want to remember about how this felt."] : undefined;

  return {
    mode: "local",
    mirror: [mirror, anchor ? `The detail I’m holding onto is: ${anchor}.` : null, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

export function localRelationships(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 160);
  const mirror = pick([
    "Relationship stuff hits different because it’s not just the event. It’s what it says about closeness, trust, or being understood.",
    "I hear the tension here. It sounds like part of you wants connection and another part wants distance.",
    "That sounds emotionally loud. Like it’s taking up space even when you’re trying not to think about it.",
  ]);

  const question = pick([
    "What’s the part that’s hardest to say out loud: what happened, or what you’re afraid it means?",
    "If you had to name what you needed in that moment, what was it: reassurance, space, respect, honesty?",
  ]);

  const nudges =
    Math.random() < 0.5
      ? pick([
          ["Write one sentence you *wish* you could say to them (you don’t have to send it)."],
          ["Two bullets: what you want from them / what you want for yourself."],
        ])
      : undefined;

  return {
    mode: "local",
    mirror: [mirror, anchor ? `The part I’m hearing most is: ${softEcho(anchor, 150)}.` : null, memLine]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
}
