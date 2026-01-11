import type { Tone, Topic } from "./types";

export function detectStartHelpIntent(text: string) {
  const t = text.toLowerCase();
  return (
    /(where do i even start|where do i start|how do i start|dont know where to start|don't know where to start|don’t know where to start|where should i start|what do i write|help me journal|how do i journal|blank page|i'?m new to journaling|im new to journaling)/.test(
      t
    ) ||
    (/\bstart\b/.test(t) && /\bwhere\b/.test(t) && t.length <= 40)
  );
}

export function detectTooTired(text: string) {
  const t = text.toLowerCase();
  const directJournal = /(too tired to journal|tired to journal|exhausted to journal|can't journal|cant journal)/.test(t);
  if (directJournal) return true;

  // Only treat “no energy” as “too tired to journal” if they actually mention journaling/writing.
  const mentionsJournaling = /\b(journal|journaling|write|writing|entry|reflect|reflection)\b/.test(t);
  if (!mentionsJournaling) return false;

  return /(too tired|don'?t have the energy|dont have the energy|no energy|brain dead|i'?m done|im done|wiped|too exhausted)/.test(t);
}

export function detectSocialAvoidanceSpiral(text: string) {
  const t = text.toLowerCase();
  const aboutTexts = /\b(texts?|messages?|dms?|reply|respond|ignored|ignoring|left on read|ghost)\b/.test(t);
  const aboutFriends = /\b(friends?|people|everyone|them|they)\b/.test(t);
  const lowEnergyToTalk =
    /\b(no energy|don'?t have the energy|dont have the energy|too tired|exhausted|drained)\b/.test(t) &&
    /\b(talk|chat|text|reply|respond)\b/.test(t);
  const spiral =
    /\b(spiral|spirals|spiraling|spiralling|snowball|snowballs|snowballing)\b/.test(t) ||
    (/\bguilt\b/.test(t) && /\bavoid\b/.test(t));
  return (aboutTexts || lowEnergyToTalk) && aboutFriends && spiral;
}

export function detectFamilyTension(text: string) {
  const t = text.toLowerCase();
  const family = /\b(parents?|mom|mum|dad|family)\b/.test(t);
  const judged = /\b(judg|judged|judgment|critic|disappoint|weird|tense)\b/.test(t);
  const lingering = /\b(stuck with me|lingered|can'?t shake|kept thinking|still thinking|longer than i expected)\b/.test(t);
  return family && (judged || lingering);
}

export function detectFriendLowBandwidth(text: string) {
  const t = text.toLowerCase();
  const friends = /\b(friends?|people|everyone)\b/.test(t);
  const annoyed = /\b(annoy|annoyed|irritat|impatient|snappy|short with)\b/.test(t);
  const withdraw = /\b(didn'?t really want to be around|did not really want to be around|don'?t want to be around|dont want to be around|wanted to be alone)\b/.test(t);
  return friends && (annoyed || withdraw);
}

export function detectRomanticUncertainty(text: string) {
  const t = text.toLowerCase();
  const romantic = /\b(person i'?m seeing|someone i'?m seeing|seeing someone|talking to|crush|partner|relationship|dating)\b/.test(t);
  const mixed = /\b(sometimes|other times|on and off|back and forth)\b/.test(t);
  const anxious = /\b(anxious|anxiety|uneasy|nervous)\b/.test(t);
  const unclear = /\b(no clear reason|can'?t pin it|cant pin it|don'?t know why|dont know why)\b/.test(t);
  return romantic && anxious && (mixed || unclear);
}

export function detectDatingFatigue(text: string) {
  const t = text.toLowerCase();
  const dating = /\b(dating|apps?|swiping|first dates?)\b/.test(t);
  const exhausted = /\b(exhaust|exhausting|tired|burnt|burned out|burnout|worn down|over it|give up)\b/.test(t);
  const wantsConnection = /\b(want connection|want a relationship|want to be with someone|want closeness)\b/.test(t);
  return dating && exhausted && (wantsConnection || /\bbut\b/.test(t));
}

export function detectLonelyEvenWithPeople(text: string) {
  const t = text.toLowerCase();
  const lonely = /\b(lonely|alone)\b/.test(t);
  const aroundPeople = /\b(talked to people|was with people|around people|saw people|hung out)\b/.test(t);
  const unclear = /\b(don'?t really know why|dont really know why|don'?t know why|dont know why)\b/.test(t);
  return lonely && aroundPeople && (unclear || /\beven though\b/.test(t));
}

export function detectSolitudeVsIsolation(text: string) {
  const t = text.toLowerCase();
  const alone = /\b(alone|by myself|on my own|solitude)\b/.test(t);
  const balance = /\b(part of me|another part|but)\b/.test(t);
  const isolation = /\b(isolat|isolating|withdrawing|shut(ting)? in)\b/.test(t);
  return alone && isolation && balance;
}

export function detectComparisonBehind(text: string) {
  const t = text.toLowerCase();
  const compare = /\b(friends?|people)\b/.test(t) && /\b(married|engaged|moving in|buying a house|kids|babies)\b/.test(t);
  const behind = /\b(falling behind|behind|late|left behind|not where i should be)\b/.test(t);
  return compare && behind;
}

export function detectConflictAvoidance(text: string) {
  const t = text.toLowerCase();
  const avoid = /\b(avoid|don'?t bring it up|dont bring it up|keep it to myself|bite my tongue|stay quiet)\b/.test(t);
  const resentment = /\b(resent|resentful|builds up|bottl|hate that about myself)\b/.test(t);
  return avoid && resentment;
}

export function detectRelationshipAsEscape(text: string) {
  const t = text.toLowerCase();
  const relationship = /\b(relationship|partner|dating)\b/.test(t);
  const escape = /\b(so i don'?t have to|so i dont have to|to avoid|escape|distract)\b/.test(t);
  const self = /\b(sit with myself|be alone with myself|myself)\b/.test(t);
  return relationship && escape && self;
}

export function detectMoneyAffectingRelationships(text: string) {
  const t = text.toLowerCase();
  const money = /\b(finance|finances|money|rent|debt|bills|paycheck|pay|broke|budget)\b/.test(t);
  const people = /\b(people|friends?|family|partner|everyone|anyone)\b/.test(t);
  const snappy = /\b(short with|snappy|snap|irritable|impatient|tense)\b/.test(t);
  return money && people && snappy;
}

export function detectUnwindIntent(text: string) {
  const t = text.toLowerCase();
  return (
    /\b(unwind|decompress|destress|de-stress|switch off|shut off|wind down|reset|relax)\b/.test(t) ||
    (/\bafter work\b/.test(t) && /\b(exhausted|tired|drained|stressed|overwhelmed)\b/.test(t)) ||
    /\b(my mind is racing|racing thoughts|too many thoughts|thoughts are colliding|can'?t stop thinking)\b/.test(t)
  );
}

export function detectPatternSeeking(text: string) {
  const t = text.toLowerCase();
  return /\b(pattern|why do i|why am i|i always|every time|i keep|again and again|it keeps happening|i notice that|cycle)\b/.test(t);
}

export function detectMoodSwingIrritability(text: string) {
  const t = text.toLowerCase();
  const swing = /\bsome days\b/.test(t) && /\bother days\b/.test(t);
  const irrit = /\b(irritat(ed|ing)?|snappy|on edge|short[- ]tempered|angry)\b/.test(t);
  const unclear =
    /\b(don'?t know why|dont know why|no idea why|can'?t pin( it)?|cant pin( it)?|not sure (why|what)|what'?s triggering|whats triggering|trigger(ing)?)\b/.test(
      t
    );
  return irrit && (swing || unclear);
}

export function detectGoodNothingNew(text: string) {
  const t = text.toLowerCase();
  const calmPositive = /\b(good|great|fine|ok|okay|nice|calm)\b/.test(t);
  const nothingMuch = /\b(nothing new|nothing much|nothing really|not much)\b/.test(t);
  return calmPositive && nothingMuch;
}

export function detectDismissiveShutdown(text: string) {
  const t = text.toLowerCase();
  return /\b(meh|whatever|idk|i\s*don'?t\s*care|doesn'?t\s*matter|eh)\b/.test(t);
}

export function detectTone(text: string): Tone {
  const t = text.toLowerCase();

  const pos =
    /\b(happy|excited|grateful|thankful|proud|relieved|good|great|amazing|fun|nice|love|calm|win|won|blessed)\b/.test(
      t
    );

  const neg =
    /\b(sad|down|anxious|panic|worry|worried|angry|mad|overwhelm|exhausted|exhausting|burnt|burned out|drained|stress|stressed|frustrat|tired|avoid|awful|worst|miserable|hate|spiral|overthink|struggling|invasive|intrusive)\b/.test(
      t
    ) ||
    /\bno time\b/.test(t) ||
    /\b(last minute|deadline|overtime|weekend|midnight|back[- ]?to[- ]?back|nonstop|on[- ]?call)\b/.test(t) ||
    /\b(everyone hates me|everybody hates me|they hate me|hate me)\b/.test(t);

  if (pos && neg) return "mixed";
  if (pos) return "positive";
  if (neg) return "negative";
  return "neutral";
}

export function detectTopic(text: string): Topic {
  const t = text.toLowerCase();

  // New to journaling / onboarding (catch very short asks too)
  if (detectStartHelpIntent(t) || /\b(start journaling|journal(ing)?|document(ing)? my thoughts)\b/i.test(t)) {
    return "new_to_journaling";
  }

  // Mental wellness / patterns
  const workSignals = /\b(boss|work|job|meeting|deadline|on-call|shift|coworker|manager|client|clients)\b/.test(t);
  const explicitMental =
    /\b(mental health|state of mind|attachment|childhood trauma|trauma|avoidant|anxious attachment)\b/.test(t) ||
    detectPatternSeeking(t) ||
    /\bwhy am i\b/.test(t);

  // Catch “fine some days, irritated other days, no clear trigger” without stealing clearly-work entries.
  if (explicitMental || (detectMoodSwingIrritability(t) && !workSignals)) {
    return "mental_wellness";
  }

  // Self-worth / social fear (keep this non-diagnostic and non-clinical)
  if (
    /\b(not good enough|worthless|failure|shame|guilt|hate myself|everyone hates me|everybody hates me|they hate me|hate me)\b/.test(
      t
    )
  ) {
    return "self_worth";
  }

  // Finances / stability
  if (/\b(finance|finances|money|rent|debt|bills|paycheck|pay|broke|budget)\b/.test(t)) {
    return "finances";
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
  if (/\b(decide|decision|choose|choice|torn|unsure|uncertain|regret|should i|what if|stuck between)\b/.test(t)) {
    return "decisions";
  }

  // Anxiety / rumination
  if (/\b(overthink|spiral|ruminat|intrusive thoughts|can'?t stop thinking|looping|catastroph)\b/.test(t)) {
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

export function detectPositiveWinCategory(text: string):
  | "gym"
  | "movement"
  | "hobby"
  | "social"
  | "cooking"
  | "health_progress"
  | "life_admin"
  | "general" {
  const t = text.toLowerCase();
  if (/\b(gym|workout|weights|lifting)\b/.test(t)) return "gym";
  if (/\b(run|ran|walk|walked|jog|yoga|stretch|exercise)\b/.test(t)) return "movement";
  if (/\b(ice skat|skating|hobby|painting|drawing|music|guitar|piano|read|reading|game|gaming|knit|crochet|photography)\b/.test(t)) {
    return "hobby";
  }
  if (/\b(hung out|hang out|friends?|social|party|date|with people|met up)\b/.test(t)) return "social";
  if (/\b(cook|cooked|bake|baked|meal|recipe)\b/.test(t)) return "cooking";
  if (/\b(weight\s*loss|lost\s+weight|scale|down\s+\d+\s*(lb|lbs|pounds|kg))\b/.test(t)) return "health_progress";
  if (/\b(clean|cleaned|laundry|dishes|tidy|organized|declutter|errands?)\b/.test(t)) return "life_admin";
  return "general";
}
