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

function splitSentences(text: string): string[] {
  const raw = (text ?? "").replace(/\n+/g, " ").trim();
  if (!raw) return [];
  // Avoid regex lookbehind for wider browser support.
  const matches = raw.match(/[^.!?]+(?:[.!?]+\s*|$)/g);
  return (matches ?? [raw]).map((s) => s.trim()).filter(Boolean);
}

function extractAnchor(text: string, max = 140): string {
  const t = normalize(text);
  if (!t) return "";

  const sentences = splitSentences(t);
  const candidates = sentences.length ? sentences : [t];

  // Prefer “because/but/so/then” sentences—they often carry the meaning.
  const preferred = candidates.find((s) => /\b(because|but|so|then|and)\b/i.test(s)) ?? candidates[0];
  return snippet(preferred, max);
}

function snippet(text: string, max = 140) {
  const t = normalize(text);
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function removeLeadingLabels(s: string) {
  return normalize(s)
    .replace(/^small\s*win\s*:\s*/i, "")
    .replace(/^win\s*:\s*/i, "")
    .replace(/^gratitude\s*:\s*/i, "")
    .replace(/^today\s*was\s*/i, "")
    .trim();
}

function softEcho(text: string, max = 130): string {
  // A “paraphrase-ish” echo: we keep 1 concrete detail, but avoid quoting the user verbatim.
  const raw = removeLeadingLabels(text);
  if (!raw) return "";
  const s = extractAnchor(raw, max);
  // Avoid returning the exact same casing/punctuation as the user wrote.
  const cleaned = normalize(s)
    .replace(/[“”"]/g, "")
    .replace(/\s*\.+\s*$/, "")
    .trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractNamedHobbyDetail(text: string): { hobby?: string; detail?: string } {
  const t = text.toLowerCase();
  const hobby = /\bpiano\b/.test(t)
    ? "piano"
    : /\bguitar\b/.test(t)
    ? "guitar"
    : /\bdrums\b/.test(t)
    ? "drums"
    : /\b(skating|ice skating|figure skating)\b/.test(t)
    ? "skating"
    : /\b(dance|dancing)\b/.test(t)
    ? "dance"
    : /\b(swim|swimming)\b/.test(t)
    ? "swimming"
    : /\b(read|reading)\b/.test(t)
    ? "reading"
    : /\b(anime|movie|show|series|k-?drama)\b/.test(t)
    ? "a familiar watch"
    : /\b(game|gaming)\b/.test(t)
    ? "gaming"
    : undefined;

  // Composer / specific “flavor” details if present.
  const detail = /\bchopin\b/i.test(text)
    ? "Chopin"
    : /\b(debussy|mozart|beethoven|bach|rachmaninoff)\b/i.test(text)
    ? (text.match(/\b(debussy|mozart|beethoven|bach|rachmaninoff)\b/i)?.[1] ?? undefined)
    : undefined;

  return { hobby, detail };
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
  | "self_worth"
  | "finances"
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
  const directJournal = /(too tired to journal|tired to journal|exhausted to journal|can't journal|cant journal)/.test(t);
  if (directJournal) return true;

  // Only treat “no energy” as “too tired to journal” if they actually mention journaling/writing.
  const mentionsJournaling = /\b(journal|journaling|write|writing|entry|reflect|reflection)\b/.test(t);
  if (!mentionsJournaling) return false;

  return /(too tired|don'?t have the energy|dont have the energy|no energy|brain dead|i'?m done|im done|wiped|too exhausted)/.test(t);
}

function detectSocialAvoidanceSpiral(text: string) {
  const t = text.toLowerCase();
  const aboutTexts = /\b(texts?|messages?|dms?|reply|respond|ignored|ignoring|left on read|ghost)\b/.test(t);
  const aboutFriends = /\b(friends?|people|everyone|them|they)\b/.test(t);
  const lowEnergyToTalk = /\b(no energy|don'?t have the energy|dont have the energy|too tired|exhausted|drained)\b/.test(t) && /\b(talk|chat|text|reply|respond)\b/.test(t);
  const spiral = /\b(spiral|spirals|spiraling|spiralling|snowball|snowballs|snowballing)\b/.test(t) ||
    (/\bguilt\b/.test(t) && /\bavoid\b/.test(t));
  return (aboutTexts || lowEnergyToTalk) && aboutFriends && spiral;
}

function detectFamilyTension(text: string) {
  const t = text.toLowerCase();
  const family = /\b(parents?|mom|mum|dad|family)\b/.test(t);
  const judged = /\b(judg|judged|judgment|critic|disappoint|weird|tense)\b/.test(t);
  const lingering = /\b(stuck with me|lingered|can'?t shake|kept thinking|still thinking|longer than i expected)\b/.test(t);
  return family && (judged || lingering);
}

function detectFriendLowBandwidth(text: string) {
  const t = text.toLowerCase();
  const friends = /\b(friends?|people|everyone)\b/.test(t);
  const annoyed = /\b(annoy|annoyed|irritat|impatient|snappy|short with)\b/.test(t);
  const withdraw = /\b(didn'?t really want to be around|did not really want to be around|don'?t want to be around|dont want to be around|wanted to be alone)\b/.test(t);
  return friends && (annoyed || withdraw);
}

function detectRomanticUncertainty(text: string) {
  const t = text.toLowerCase();
  const romantic = /\b(person i'?m seeing|someone i'?m seeing|seeing someone|talking to|crush|partner|relationship|dating)\b/.test(t);
  const mixed = /\b(sometimes|other times|on and off|back and forth)\b/.test(t);
  const anxious = /\b(anxious|anxiety|uneasy|nervous)\b/.test(t);
  const unclear = /\b(no clear reason|can'?t pin it|cant pin it|don'?t know why|dont know why)\b/.test(t);
  return romantic && anxious && (mixed || unclear);
}

function detectDatingFatigue(text: string) {
  const t = text.toLowerCase();
  const dating = /\b(dating|apps?|swiping|first dates?)\b/.test(t);
  const exhausted = /\b(exhaust|exhausting|tired|burnt|burned out|burnout|worn down|over it|give up)\b/.test(t);
  const wantsConnection = /\b(want connection|want a relationship|want to be with someone|want closeness)\b/.test(t);
  return dating && exhausted && (wantsConnection || /\bbut\b/.test(t));
}

function detectLonelyEvenWithPeople(text: string) {
  const t = text.toLowerCase();
  const lonely = /\b(lonely|alone)\b/.test(t);
  const aroundPeople = /\b(talked to people|was with people|around people|saw people|hung out)\b/.test(t);
  const unclear = /\b(don'?t really know why|dont really know why|don'?t know why|dont know why)\b/.test(t);
  return lonely && aroundPeople && (unclear || /\beven though\b/.test(t));
}

function detectSolitudeVsIsolation(text: string) {
  const t = text.toLowerCase();
  const alone = /\b(alone|by myself|on my own|solitude)\b/.test(t);
  const balance = /\b(part of me|another part|but)\b/.test(t);
  const isolation = /\b(isolat|isolating|withdrawing|shut(ting)? in)\b/.test(t);
  return alone && isolation && balance;
}

function detectComparisonBehind(text: string) {
  const t = text.toLowerCase();
  const compare = /\b(friends?|people)\b/.test(t) && /\b(married|engaged|moving in|buying a house|kids|babies)\b/.test(t);
  const behind = /\b(falling behind|behind|late|left behind|not where i should be)\b/.test(t);
  return compare && behind;
}

function detectConflictAvoidance(text: string) {
  const t = text.toLowerCase();
  const avoid = /\b(avoid|don'?t bring it up|dont bring it up|keep it to myself|bite my tongue|stay quiet)\b/.test(t);
  const resentment = /\b(resent|resentful|builds up|bottl|hate that about myself)\b/.test(t);
  return avoid && resentment;
}

function detectRelationshipAsEscape(text: string) {
  const t = text.toLowerCase();
  const relationship = /\b(relationship|partner|dating)\b/.test(t);
  const escape = /\b(so i don'?t have to|so i dont have to|to avoid|escape|distract)\b/.test(t);
  const self = /\b(sit with myself|be alone with myself|myself)\b/.test(t);
  return relationship && escape && self;
}

function detectMoneyAffectingRelationships(text: string) {
  const t = text.toLowerCase();
  const money = /\b(finance|finances|money|rent|debt|bills|paycheck|pay|broke|budget)\b/.test(t);
  const people = /\b(people|friends?|family|partner|everyone|anyone)\b/.test(t);
  const snappy = /\b(short with|snappy|snap|irritable|impatient|tense)\b/.test(t);
  return money && people && snappy;
}

function localFamilyTension(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Those conversations can linger in a way that’s hard to shake, even when nothing overtly bad happens.",
    "It makes sense that this stuck with you. Family dynamics can leave a weird aftertaste even when the surface is calm.",
  ]);

  const mirror2 = pick([
    "Feeling judged doesn’t always come from the words. Sometimes it’s tone, history, or what you know they’ll assume.",
    "That judged feeling can be more about the subtext than the content.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, mirror2, memLine].filter(Boolean).join("\n\n"),
    question: "When you think about that conversation now, what part of it is still sitting with you?",
  };
}

function localFriendLowBandwidth(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That doesn’t sound bad. That sounds like low bandwidth.",
    "This reads less like you don’t care, and more like your system is stretched.",
  ]);

  const mirror2 = pick([
    "Irritability is often the first sign you need less input, not that your friends are doing something wrong.",
    "When you’re running low, even normal social stuff can feel like too much.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, mirror2, memLine].filter(Boolean).join("\n\n"),
    question: "Do you feel more annoyed by them, or more drained in general right now?",
  };
}

function localRomanticUncertainty(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That mix of excitement and anxiety can be confusing, especially when you can’t pin it to anything specific.",
    "When it feels good sometimes and anxious other times, it doesn’t automatically mean something is wrong. It does mean something is worth noticing.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "When the anxiety shows up, does it feel more about them, or about how you feel around them?",
  };
}

function localDatingFatigue(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Wanting connection while feeling worn down by the path to it is a real tension.",
    "This reads less like hopelessness and more like burnout from the process.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "If dating wasn’t on the table at all right now, what kind of connection would you want instead?",
  };
}

function localLoneliness(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That kind of loneliness can be harder than being alone. You can be around people and still feel unseen.",
    "Loneliness with company is a specific kind of ache. It’s like there’s contact, but not closeness.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "Did it feel like you were missing closeness, understanding, or just quiet companionship?",
  };
}

function localSolitudeVsIsolation(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That balance between solitude and isolation can be subtle.",
    "Enjoying alone time doesn’t automatically mean something is wrong. The question is whether it’s feeding you or shrinking you.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "What does being alone give you right now, and what does it take away?",
  };
}

function localComparisonBehind(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That comparison can hit quietly but deeply.",
    "Knowing it’s not logical doesn’t make it stop feeling real.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "When that feeling comes up, what story do you tell yourself about where you should be?",
  };
}

function localConflictAvoidance(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That sounds like self-protection that’s starting to cost you.",
    "Avoidance often starts as a way to keep the peace, and then it turns into resentment later.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "What feels riskier right now: speaking up, or continuing to carry it quietly?",
  };
}

function localRelationshipAsEscape(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That’s a really honest thing to notice.",
    "Wanting connection and wanting escape can overlap more than people admit.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "When you imagine being there for yourself, what feels hardest about that?",
  };
}

function localMoneyAffectingRelationships(memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Financial stress has a way of leaking into everything, especially patience.",
    "It makes sense that money stress is affecting how you show up with people. Living tense all the time is exhausting.",
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question: "If the money stress eased even a little, what do you think would feel different socially?",
  };
}

function detectUnwindIntent(text: string) {
  const t = text.toLowerCase();
  return /\b(unwind|decompress|destress|de-stress|switch off|shut off|wind down|reset|relax)\b/.test(t) ||
    (/\bafter work\b/.test(t) && /\b(exhausted|tired|drained|stressed|overwhelmed)\b/.test(t)) ||
    /\b(my mind is racing|racing thoughts|too many thoughts|thoughts are colliding|can'?t stop thinking)\b/.test(t);
}

function localUnwindDecompress(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 150);
  const mirror = [
    pick([
      "This reads like the kind of day that follows you home. Your body’s off work, but your mind isn’t.",
      "It sounds like you’re trying to come down from a high-pressure day and your thoughts are still running.",
      "That ‘colliding thoughts’ feeling is real. It’s hard to unwind when your brain won’t stop narrating.",
    ]),
    anchor ? `The part that stands out is: ${softEcho(anchor, 140)}.` : null,
    pick([
      "You don’t have to solve everything tonight. You just need a softer landing.",
      "Let’s aim for a small reset, not a perfect unwind.",
    ]),
    memLine,
  ]
    .filter(Boolean)
    .join("\n\n");

  const question = pick([
    "If you could set down one thing for the next hour, what would it be?",
    "What would help you switch off by 10%: a plan for tomorrow, a boundary, or a small ritual?",
  ]);

  const nudges = pick([
    [
      "2-minute dump: write every thought as a bullet. No order. No fixing.",
      "Then circle one: ‘this can wait’ vs ‘this needs a tiny next step’.",
    ],
    [
      "Name 3 things: what happened / what you’re feeling / what you need tonight.",
      "If that’s too much: one word for your mood + one kind thing you’ll do next.",
    ],
  ]);

  return { mode: "local", mirror, question, nudges };
}

function detectPatternSeeking(text: string) {
  const t = text.toLowerCase();
  return /\b(pattern|why do i|why am i|i always|every time|i keep|again and again|it keeps happening|i notice that|cycle)\b/.test(t);
}

function localPatternInsight(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 160);
  const mirror = [
    pick([
      "I hear you trying to understand the *pattern*, not just vent about the moment.",
      "This reads like you’re zooming out — like: ‘what is it about me / my life that keeps doing this?’",
    ]),
    anchor ? `What you’re pointing at is: ${softEcho(anchor, 150)}.` : null,
    pick([
      "That’s a strong move — noticing the loop is usually the first step to changing it.",
      "We can treat this like curiosity, not self-judgment.",
    ]),
    memLine,
  ]
    .filter(Boolean)
    .join("\n\n");

  const question = pick([
    "When does this pattern show up most — after stress, after conflict, when you’re tired, or when you feel pressure?",
    "What do you think this pattern is trying to protect you from (even if it’s messy)?",
    "What’s the cost of the pattern — and what’s the tiny benefit that keeps it around?",
  ]);

  const nudges = Math.random() < 0.65
    ? pick([
        [
          "Three bullets: Trigger / Story your brain tells / What you do next.",
          "Then: one 5% experiment you could try next time.",
        ],
        [
          "Finish: ‘The moment I start to spiral is usually when…’",
          "Finish: ‘What I actually need in that moment is…’",
        ],
      ])
    : undefined;

  return { mode: "local", mirror, question, nudges };
}

function localSocialAvoidanceSpiral(text: string, memLine: string | null): ReflectionOutput {
  const t = text.toLowerCase();
  const openerDetail = /\bignored|ignoring|ghost|left on read\b/.test(t)
    ? "You’re not being mean. You’re trying to conserve energy, and it’s turning into avoidance."
    : "You’re not being mean. You’re running low on energy, and replying starts to feel harder than it should.";

  const mirror = pick([
    `That’s such a real spiral. You care about your friends, but you don’t have the energy to talk. Then the silence starts to feel heavier, so it gets even harder to reply.\n\n${openerDetail}`,
    `It sounds like it’s not about liking them. It’s about bandwidth. When you’re low-energy, texting can feel like a task, and then the guilt makes it snowball.\n\n${openerDetail}`,
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

function detectGoodNothingNew(text: string) {
  const t = text.toLowerCase();
  const calmPositive = /\b(good|great|fine|ok|okay|nice|calm)\b/.test(t);
  const nothingMuch = /\b(nothing new|nothing much|nothing really|not much)\b/.test(t);
  return calmPositive && nothingMuch;
}

function detectDismissiveShutdown(text: string) {
  const t = text.toLowerCase();
  return /\b(meh|whatever|idk|i\s*don'?t\s*care|doesn'?t\s*matter|eh)\b/.test(t);
}

function detectTone(text: string): Tone {
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

function toKeywords(s: string): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => w.length >= 4)
    .slice(0, 20);
}

function overlapScore(needle: string, haystackLower: string): number {
  const keys = toKeywords(needle);
  if (!keys.length) return 0;
  let score = 0;
  for (const k of keys) {
    if (haystackLower.includes(k)) score += 1;
  }
  return score;
}

function pickBestMatch(items: string[], entryLower: string): string | null {
  let best: { s: string; score: number } | null = null;
  for (const s of items) {
    const score = overlapScore(s, entryLower);
    if (!best || score > best.score) best = { s, score };
  }
  if (!best) return null;
  // Require at least one meaningful overlap; otherwise it's likely irrelevant.
  if (best.score <= 0) return null;
  return best.s;
}

function selectRelevantMemory(
  mem: UserMemory | undefined,
  entryText: string,
  tone: Tone,
  topic: Topic,
  intents?: { unwind?: boolean; pattern?: boolean }
): { coping?: string; like?: string; hobby?: string; person?: string; stressor?: string; win?: string } {
  if (!mem) return {};
  const entryLower = (entryText ?? "").toLowerCase();

  const coping = mem.coping.length ? pickBestMatch(mem.coping, entryLower) : null;
  const like = mem.likes.length ? pickBestMatch(mem.likes, entryLower) : null;
  const hobby = mem.hobbies.length ? pickBestMatch(mem.hobbies, entryLower) : null;
  const person = mem.people.length ? pickBestMatch(mem.people, entryLower) : null;
  const stressor = mem.stressors.length ? pickBestMatch(mem.stressors, entryLower) : null;
  const win = mem.wins.length ? pickBestMatch(mem.wins, entryLower) : null;

  const isRole = (p: string) =>
    [
      "mom",
      "dad",
      "mother",
      "father",
      "sister",
      "brother",
      "partner",
      "girlfriend",
      "boyfriend",
      "wife",
      "husband",
      "roommate",
      "coworker",
      "manager",
      "boss",
      "friend",
      "friends",
    ].includes(p.toLowerCase());

  // Topic-based nudges: allow relevant coping even without literal overlap
  // (e.g., work stress -> movement/breathing can still be relevant), but keep it conservative.
  const allowCopingByTopic =
    (topic === "work" || topic === "relationships" || topic === "anxiety_rumination" || topic === "mental_wellness") &&
    (tone === "negative" || tone === "mixed");

  // People and hobbies can be helpful, but keep them highly relevant.
  // - People: only surface when entry is relationship-focused (or direct overlap).
  // - Hobbies: only surface when the entry is about unwinding/decompressing (or direct overlap).
  const allowPersonByTopic = topic === "relationships";
  const allowHobbyByIntent = Boolean(intents?.unwind);

  const personFallback = allowPersonByTopic ? mem.people.find(isRole) ?? undefined : undefined;
  const hobbyFallback = allowHobbyByIntent ? mem.hobbies[0] : undefined;

  return {
    coping: coping ?? (allowCopingByTopic ? mem.coping[0] : undefined),
    like: tone === "positive" && topic !== "work" ? (like ?? undefined) : undefined,
    hobby: hobby ?? hobbyFallback,
    person: person ?? personFallback,
    stressor: tone !== "positive" ? (stressor ?? undefined) : undefined,
    win: tone === "positive" || topic === "wins_gratitude" ? (win ?? undefined) : undefined,
  };
}

function maybeMemoryLine(mem: UserMemory | undefined, entryText: string, tone: Tone, topic: Topic): string | null {
  if (!mem) return null;

  const relevant = selectRelevantMemory(mem, entryText, tone, topic);
  const hasAnything = Boolean(relevant.coping || relevant.like || relevant.stressor || relevant.win);
  if (!hasAnything) return null;

  // subtle but demo-visible
  const show = Math.random() < 0.18;
  if (!show) return null;

  if ((tone === "negative" || tone === "mixed") && relevant.coping) {
    const c = relevant.coping;
    return pick([
      `Small thing I’m remembering: you’ve said **${c}** can help sometimes. Does that feel true today, or not really?`,
      `You’ve mentioned **${c}** helping before — not as a fix, just as a small reset.`,
    ]);
  }

  if (tone === "positive" && relevant.like && topic !== "work") {
    const l = relevant.like;
    return pick([
      `Tiny callback: you’ve mentioned you like **${l}** — small joys count.`,
      `This kind of reminds me of what you said about **${l}** — it fits this lighter moment.`,
    ]);
  }

  // Wins callbacks should not show up inside negative relationship/work entries.
  if (relevant.win && (tone === "positive" || topic === "wins_gratitude") && topic !== "relationships" && topic !== "work") {
    const w = relevant.win;
    return pick([
      `Small reminder: you’ve had wins like **${w}** — you’re building a pattern.`,
      `You’ve been stacking small wins (like **${w}**).`,
    ]);
  }

  if ((tone === "negative" || tone === "mixed" || tone === "neutral") && relevant.stressor) {
    const s = relevant.stressor;
    return pick([
      `Tiny callback: you’ve mentioned **${s}** being stressful before — does this feel connected?`,
      `This reminds me of when you said **${s}** was weighing on you. No need to force a link — just noticing.`,
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

function localNewToJournaling(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 140);
  const mirror = pick([
    "You’re in the right place. You don’t need a perfect starting point, just a first sentence.",
    "Totally normal to not know where to start. Let’s make it easy and low-pressure.",
    "We can keep this simple. This is a place to think out loud, not a place to write perfectly.",
  ]);

  const question = pick([
    "What do you want most right now: to vent, to understand a pattern, or to calm down?",
    "Do you want to start with what happened today, what you’re feeling, or what you’ve been carrying lately?",
  ]);

  const nudges = pick([
    [
      "Tiny start: Today was ___ because ___.",
      "Or: Right now I feel ___ and I need ___.",
      "Or: One thing I wish I could say out loud is ___.",
    ],
    [
      "Write 3 bullets: what happened / how it affected you / what you want next.",
      "If that’s too much: write just one word for your mood.",
    ],
  ]);

  return {
    mode: "local",
    mirror: [
      mirror,
      anchor ? `One concrete thing you already named is: ${softEcho(anchor, 120)}. We can start there.` : null,
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
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
      "Fill one blank: Today was ___.",
      "Or: The main thing was ___.",
      "Or: Tomorrow I want ___ (even if it’s just rest).",
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
  const anchor = extractAnchor(_text, 150);
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

  return {
    mode: "local",
    mirror: [mirror, anchor ? `The detail I’m holding onto is: ${anchor}.` : null, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

function localFinances(_text: string, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "Money stress can feel so loud because it touches safety. I’m sorry you’re carrying that today.",
    "That sounds really heavy — finances have a way of sitting in the background of everything.",
    "I hear the strain here. Money pressure can make even small things feel sharper.",
  ]);

  const question = pick([
    "Is this more about the numbers right now, or the uncertainty of not knowing what’s next?",
    "What’s the most immediate pressure — a bill, a deadline, or just the ongoing stress of it?",
  ]);

  const nudges = pick([
    [
      "Tiny step: write the next one thing you need to handle (just one).",
      "Optional: what support would actually help — a plan, a conversation, or a little relief today?",
    ],
    [
      "Two bullets: what’s urgent this week / what can wait until later.",
      "If you want: one small action that might reduce stress by 5%.",
    ],
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges: nudges.slice(0, 3),
  };
}

function localSelfWorth(_text: string, memLine: string | null): ReflectionOutput {
  const mirror = pick([
    "That thought that everyone hates you is a really painful place to be. I’m glad you wrote it instead of keeping it sealed in.",
    "I hear how harsh this feels. When your brain is telling you people hate you, it can make everything feel personal and heavy.",
    "That’s a lot to sit with. Feeling disliked or unwanted can hit deeper than the situation itself.",
  ]);

  const question = pick([
    "Did something specific happen that sparked that feeling today, or is it more of a general vibe?",
    "When that thought shows up, what’s the most convincing ‘evidence’ your mind points to?",
  ]);

  const nudges = pick([
    [
      "Name one person you feel even 5% safer with (or write: none right now).",
      "Optional: what would you *want* to hear from someone if they understood how you feel?",
    ],
    [
      "Try one line: The story my brain is telling is…",
      "Then one line: What I actually know for sure is…",
    ],
  ]);

  return {
    mode: "local",
    mirror: [mirror, memLine].filter(Boolean).join("\n\n"),
    question,
    nudges: nudges.slice(0, 3),
  };
}

function localMentalWellness(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 160);
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
    mirror: [mirror1, anchor ? `What you’re noticing is: ${softEcho(anchor, 150)}.` : null, mirror2, memLine]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
}

function localWorkStress(text: string, memLine: string | null): ReflectionOutput {
  const answered = extractAnsweredDrainingPart(text);
  const dismissive = detectDismissiveShutdown(text);

  const t = text.toLowerCase();
  const mentionsTimeNotYours = /\b(time (isn'?t|is not) mine|my time (isn'?t|is not) mine|personal time|after hours|staying late|late night)\b/.test(t);
  const mentionsNoSlack = /\b(back[- ]?to[- ]?back|no break|no breaks|no slack|packed|nonstop|all day)\b/.test(t);
  const mentionsFoodSkipped = /\b(didn'?t eat|did not eat|no lunch|skipped lunch|forgot to eat|ate at|didn'?t have time to eat)\b/.test(t);

  const mirror1 = pick([
    "Yeah… that sounds brutal. Not just busy, but the kind of day with no room to breathe.",
    "That’s a lot. When work expands into your personal time, it can start to feel like there’s no real off switch.",
    "I get why you’d feel like you’re putting too much into work. That reads like constant output with no refill.",
  ]);

  const mirror2 = answered
    ? "And you already named the draining part clearly. That kind of clarity matters." 
    : dismissive
    ? pick([
        "That little shrug at the end feels like your brain trying to shut it down just to get through it.",
        "That ‘whatever’ energy reads like fatigue. Like you’re trying not to feel the whole thing at once.",
      ])
    : pick([
        mentionsTimeNotYours
          ? "Days like that can make it feel like your time belongs to everyone but you."
          : "Back-to-back days like that can make it feel like your time belongs to everyone but you.",
        mentionsFoodSkipped
          ? "Not getting a real chance to eat is a loud signal your day had zero slack in it."
          : "That pace is the kind where you’re doing everything ‘right’ and still end up depleted.",
        mentionsNoSlack ? "It makes sense your system is still on. You didn’t get a single exhale." : "",
      ]);

  // If they already answered “what’s most draining”, don’t ask it again—move forward.
  const question = answered
    ? pick([
        "What would a realistic boundary look like here, even a small one you could hold this week?",
        "If you could change one thing that protects your time, what’s the most doable change?",
      ])
    : pick([
        "What part of this is most draining: the schedule, the pressure, or the feeling that your time isn’t yours?",
        "If you could change one thing about your work week right now, what would give you the biggest relief?",
      ]);

  const nudges =
    Math.random() < 0.6
      ? pick([
          ["Name one boundary you wish you had today (time, scope, availability)."],
          ["Write one sentence: What I need more of is ___.", "And one: What I need less of is ___."],
          ["Quick check: what’s one small thing you can do tonight that belongs to you?"],
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
  const anchor = extractAnchor(text, 160);
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

  return {
    mode: "local",
    mirror: [mirror, anchor ? `The part I’m hearing most is: ${softEcho(anchor, 150)}.` : null, memLine]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
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

function localAnxiety(text: string, memLine: string | null): ReflectionOutput {
  const anchor = extractAnchor(text, 150);
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

  return {
    mode: "local",
    mirror: [mirror, anchor ? `The loop I’m hearing is: ${softEcho(anchor, 140)}.` : null, memLine]
      .filter(Boolean)
      .join("\n\n"),
    question,
    nudges,
  };
}

type GuidedSessionQA = { q: string; a: string };

function parseGuidedSession(text: string): { modeTitle: string; qa: GuidedSessionQA[]; takeaway?: string } | null {
  const lines = (text ?? "").split("\n").map((l) => l.trimEnd());
  const header = (lines[0] ?? "").trim();
  const headerMatch = header.match(/^Guided Session\s*(?:—|-|:)\s*(.+)$/i);
  if (!headerMatch) return null;

  const modeTitle = (headerMatch[1] ?? "").trim();
  const qa: GuidedSessionQA[] = [];

  let i = 1;
  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();
    const m = line.match(/^\d+\.\s+(.*)$/);
    if (!m) {
      i++;
      continue;
    }

    const q = m[1].trim();
    i++;
    const answerLines: string[] = [];
    while (i < lines.length) {
      const cur = (lines[i] ?? "");
      const curTrim = cur.trim();
      if (!curTrim) {
        i++;
        break;
      }
      if (/^\d+\.\s+/.test(curTrim) || /^One-line takeaway:/i.test(curTrim)) break;
      answerLines.push(curTrim);
      i++;
    }

    const a = answerLines.join("\n").trim();
    if (q) qa.push({ q, a });
  }

  const takeawayIdx = lines.findIndex((l) => /^One-line takeaway:/i.test(l.trim()));
  const takeaway = takeawayIdx >= 0 ? (lines[takeawayIdx + 1] ?? "").trim() : undefined;

  return { modeTitle, qa, takeaway };
}

function detectPositiveWinCategory(text: string):
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

function localWins(text: string, memLine: string | null): ReflectionOutput {
  const guided = parseGuidedSession(text);
  const category = detectPositiveWinCategory(text);

  const guidedWin = guided?.qa[0]?.a?.trim() ?? "";
  const guidedWhy = guided?.qa[1]?.a?.trim() ?? "";
  const guidedKindStory = guided?.qa[2]?.a?.trim() ?? "";
  const guidedNext = guided?.qa[3]?.a?.trim() ?? "";

  const anchor = guidedWin || normalize(text).slice(0, 180);

  const winEcho = (() => {
    const t = text.toLowerCase();
    if (category === "cooking") {
      const grounding = /\bgrounding\b/.test(t) ? " — and you even felt it as grounding" : "";
      return "You cooked a real meal instead of ordering in" + grounding + ".";
    }
    if (category === "life_admin") return "You handled a real-life task that makes future-you’s day easier.";
    if (category === "gym" || category === "movement") return "You chose movement even when it would’ve been easier to skip it.";
    if (category === "social") return "You showed up socially and let connection count as part of the day.";
    if (category === "hobby") {
      const { hobby, detail } = extractNamedHobbyDetail(text);
      if (hobby && detail) return `You made space for ${hobby} — and you even spent time with ${detail}.`;
      if (hobby) return `You made space for ${hobby} — the kind of win that actually restores you.`;
      return "You made space for something that restores you, not just something you have to do.";
    }
    const e = softEcho(anchor, 120);
    return e ? `You noticed something worth giving yourself credit for: ${e.toLowerCase()}.` : "You noticed something worth giving yourself credit for.";
  })();

  const categoryLine = (() => {
    if (category === "gym") {
      return pick([
        "Going to the gym (especially when you’ve been avoiding it) is a bigger step than it sounds — it’s walking into effort on purpose.",
        "The first gym trip is its own hurdle — new space, new rhythm, new discomfort. Showing up anyway matters.",
      ]);
    }
    if (category === "movement") {
      return pick([
        "Choosing movement on a day you could’ve stayed stuck is a quiet kind of self-trust.",
        "That kind of ‘I did it anyway’ energy is how momentum starts.",
      ]);
    }
    if (category === "social") {
      return pick([
        "Showing up socially can take real energy — especially when it’d be easier to stay in your head.",
        "Connection counts as a win. It’s you choosing life outside the loop.",
      ]);
    }
    if (category === "hobby") {
      return pick([
        "Making space for a hobby is you giving yourself more than just responsibilities.",
        "That’s the kind of win that restores you — not just checks a box.",
      ]);
    }
    if (category === "cooking") {
      return pick([
        "Cooking for yourself is care you can actually taste.",
        "That’s a grounded win — effort that turns into something real.",
      ]);
    }
    if (category === "health_progress") {
      return pick([
        "Noticing progress is good — the part that really matters is the pattern you’re building to support yourself.",
        "That’s a meaningful step. Sustainable progress is usually made of moments exactly like this.",
      ]);
    }
    if (category === "life_admin") {
      return pick([
        "Life-admin wins count. Clearing one small thing can unclog your whole day.",
        "That’s you reducing friction for future-you — genuinely kind.",
      ]);
    }
    return pick([
      "This is worth holding onto. Wins don’t have to be dramatic to count.",
      "I love that you noticed this. That’s how you build a record of what actually works for you.",
      "That’s a real bright spot. Let it land.",
    ]);
  })();

  const mirrorParts: string[] = [];
  mirrorParts.push(
    guided
      ? pick([
          `That’s a real win — and it sounds earned. (${guided.modeTitle} sessions are basically practice reps for your life.)`,
          `This reads like a genuine “I moved myself forward” moment.`,
        ])
      : pick([
          "That’s a real win.",
          "This deserves credit.",
        ])
  );

  // Paraphrase a specific detail without quoting the user.
  mirrorParts.push(winEcho);

  mirrorParts.push(categoryLine);

  if (guidedWhy) {
    mirrorParts.push(
      pick([
        `And your “why” is clear — you’re choosing a shift, not waiting for motivation. (${softEcho(guidedWhy, 140)})`,
        `You didn’t just stumble into it — there was intention behind it. (${softEcho(guidedWhy, 140)})`,
      ])
    );
  }

  if (guidedKindStory) {
    mirrorParts.push(
      pick([
        `I also hear something kind in how you talked to yourself. Keep that voice around — it makes change sustainable. (${softEcho(guidedKindStory, 120)})`,
        `The tone you used with yourself matters here. It’s the kind that makes growth sustainable. (${softEcho(guidedKindStory, 120)})`,
      ])
    );
  }

  if (guidedNext) {
    mirrorParts.push(
      pick([
        `Next step is simple on purpose — consistency beats intensity. (${softEcho(guidedNext, 90)})`,
        `That next step is perfect because it’s doable. Keep it small enough that it actually happens. (${softEcho(guidedNext, 90)})`,
      ])
    );
  }

  const question = pick([
    "What would make the next time 10% easier to start?",
    "If you replay this win, what part of *you* do you want to remember most?",
    "What’s the smallest, most realistic version of your next step this week?",
  ]);

  const nudges = Math.random() < 0.3
    ? pick([
        ["Write one line to future-you: “When it feels hard, remember…”"],
        ["Pick a tiny ‘minimum version’ of the habit you can do even on a bad day."],
        ["Name what helped: time, place, cue, or a thought that pushed you forward."],
      ])
    : undefined;

  return {
    mode: "local",
    mirror: [mirrorParts.join("\n\n"), memLine].filter(Boolean).join("\n\n"),
    question,
    nudges,
  };
}

function localHobbyJoy(text: string, memLine: string | null): ReflectionOutput {
  const { hobby, detail } = extractNamedHobbyDetail(text);
  const lower = text.toLowerCase();
  const ease = /\b(ease|at ease|calm|calming|ground|grounding|relax|relaxing|peace)\b/.test(lower);
  const focus = /\b(focus|focused|flow|in the zone)\b/.test(lower);

  const hobbyPhrase = hobby ? hobby : "a hobby you love";
  const detailPhrase = detail ? `, especially ${detail}` : "";

  const mirror = [
    pick([
      "This reads like the good kind of fun, the kind that gives you something back.",
      "I love this kind of entry. It has real lightness in it.",
      "That sounds genuinely nourishing, not just nice.",
    ]),
    `You made space for ${hobbyPhrase}${detailPhrase}.`,
    ease
      ? "And it sounds like it settled your mind. Not by solving anything, just by bringing you back into your body and attention."
      : focus
      ? "It sounds like it pulled you into focus, the kind where your brain gets a break from noise."
      : "It reads like it gave you a clean, steady kind of ease.",
    pick([
      "That’s not trivial. That’s you remembering what helps.",
      "Moments like that are how you build a life that isn’t only obligations.",
    ]),
    memLine,
  ]
    .filter(Boolean)
    .join("\n\n");

  const question = pick([
    `What part of ${hobbyPhrase} did your mind need today: the focus, the sound, the challenge, or the comfort?`,
    "What do you think made it feel so calming this time: the music itself, or the act of playing?",
    "If you wanted more days like this, what’s the smallest version you could repeat (even 10 minutes)?",
  ]);

  const nudges = Math.random() < 0.4
    ? pick([
        ["Tiny note: where were you playing, and what time of day? Sometimes the setting is part of the calm."],
        ["Optional: write one line you’d want to reread on a rough day: ‘When I play, I remember that…’"],
      ])
    : undefined;

  return { mode: "local", mirror, question, nudges };
}

function localHealthPositive(text: string, memLine: string | null): ReflectionOutput {
  const category = detectPositiveWinCategory(text);

  const mirror =
    category === "gym"
      ? pick([
          "That’s a strong kind of win — you went to the gym. The first step is often the hardest one.",
          "Going to the gym counts twice: you did the effort, and you proved you can start.",
        ])
      : pick([
          "That sounds like your body got something good today.",
          "That kind of self-care is quiet, but it’s real.",
        ]);

  const question = pick([
    "What helped you actually get started — timing, mindset, a plan, someone else?",
    "What would you want to repeat from this the next time you try it?",
  ]);

  const nudges = Math.random() < 0.25 ? pick([
    ["Write one sentence: “I’m the kind of person who…” (keep it believable)."],
    ["Pick a tiny next step you can do within 24 hours."],
  ]) : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), question, nudges };
}

function localFoodPositive(text: string, memLine: string | null): ReflectionOutput {
  const lower = text.toLowerCase();
  const userSaidYummy = /\b(yummy|delicious|tasty)\b/.test(lower);

  const mirror = pick([
    "Honestly, a good meal can change the whole day’s vibe.",
    "I love when the journal is just: that was nice. Simple joys count.",
    "That sounds like a small reset — the kind you actually feel in your body.",
  ]);

  const nudges = Math.random() < 0.25
    ? [userSaidYummy ? "Write one line: Today tasted like…" : "Write one line: Today felt like…"]
    : undefined;

  return { mode: "local", mirror: [mirror, memLine].filter(Boolean).join("\n\n"), nudges };
}

function localGuidedSession(
  guided: { modeTitle: string; qa: { q: string; a: string }[]; takeaway?: string },
  memLine: string | null
): ReflectionOutput {
  const mode = guided.modeTitle.toLowerCase().trim();
  const a1 = guided.qa[0]?.a?.trim() ?? "";
  const a2 = guided.qa[1]?.a?.trim() ?? "";
  const a3 = guided.qa[2]?.a?.trim() ?? "";
  const a4 = guided.qa[3]?.a?.trim() ?? "";

  const answers = [a1, a2, a3, a4].filter(Boolean);

  const allowedShort = new Set([
    "ok",
    "okay",
    "fine",
    "good",
    "great",
    "meh",
    "tired",
    "exhausted",
    "sad",
    "happy",
    "anxious",
    "stressed",
    "calm",
    "busy",
    "neutral",
  ]);

  function looksLikePlaceholderAnswer(a: string) {
    const n = normalize(a);
    const lower = n.toLowerCase();
    if (!n) return true;

    // single-letter / tiny fragments
    if (n.length <= 2 && !allowedShort.has(lower)) return true;

    // repeated-char placeholder (aaaa, ....)
    if (/^(.)\1{2,}$/.test(lower)) return true;

    // common non-answers
    if (/^(idk|n\/?a|na|none|nothing|whatever|\?+)$/.test(lower)) return true;

    // keysmash-ish
    const letters = (lower.match(/[a-z]/g) ?? []).length;
    const vowels = (lower.match(/[aeiou]/g) ?? []).length;
    if (letters >= 10 && vowels / Math.max(1, letters) < 0.15) return true;

    return false;
  }

  const meaningful = answers.filter((a) => !looksLikePlaceholderAnswer(a));

  // If the user basically entered placeholders ("a", keysmash, etc.), ask for one more sentence
  // instead of generating a confident reflection.
  if (answers.length > 0 && meaningful.length === 0) {
    const mirror = pick([
      "I’m here — I only got tiny fragments (like a placeholder), so I can’t reflect back much yet.",
      "I caught the structure of the session, but the answers look like placeholders — want to add one real sentence?",
    ]);

    const question = pick([
      "Which prompt is easiest to answer with one honest sentence?",
      "Want to expand just one answer — the one that feels most real right now?",
    ]);

    const nudges = pick([
      [
        "Unwind: “What’s still buzzing is…”",
        "Helped: “One thing that helped was…”",
        "Let go: “Tonight I’m letting go of…”",
        "Next hour: “One kind thing I’ll do is…”",
      ],
      [
        "If you’re tired: “I’m exhausted because ___.”",
        "If you’re blank: “The main thing on my mind is ___.”",
      ],
    ]);

    return { mode: "local", mirror, question, nudges };
  }

  // Keep it warm + specific, without over-claiming.
  if (mode === "small win") {
    return localWins(
      [
        guided.qa.map((x, i) => `${i + 1}. ${x.q}\n${x.a}`).join("\n\n"),
        guided.takeaway ? `One-line takeaway:\n${guided.takeaway}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      memLine
    );
  }

  if (mode === "unwind") {
    const mirror = [
      pick([
        "This reads like a tired day — the kind where your body’s asking for a softer landing.",
        "I hear low energy here. You’re not being lazy — you’re depleted.",
      ]),
      a1 ? `What’s still buzzing is basically: ${softEcho(a1, 110)}.` : null,
      a2
        ? pick([
            `And you did reach for a few real stabilizers. Those count, especially on tired days. (${softEcho(a2, 120)})`,
            `What helped wasn’t abstract. It was concrete. That’s useful information. (${softEcho(a2, 120)})`,
          ])
        : null,
      a3
        ? pick([
            `Letting go of ${softEcho(a3, 90).toLowerCase()} tonight is a boundary, even if it’s a small one.`,
            `You’re trying to set work down for the night. That’s a skill, not a switch.`,
          ])
        : null,
      a4
        ? pick([
            `For the next hour, ${softEcho(a4, 90).toLowerCase()} sounds like exactly the right kind of gentle.`,
            `That next-hour plan feels like a kind choice: quiet, doable, restorative. (${softEcho(a4, 90)})`,
          ])
        : null,
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n");

    const question = pick([
      "What would make it easier to actually let work go tonight: a quick brain-dump, a boundary, or a good-enough plan for tomorrow?",
      "If you could give tired-you one permission slip tonight, what would it say?",
      "What’s the smallest version of rest you can actually do in the next 20 minutes?",
    ]);

    const nudges = Math.random() < 0.35
      ? pick([
          ["Write 3 bullets: what can wait / what can’t / what you’ll do tomorrow."],
          ["Choose one closing ritual: shower, tea/coffee, one chapter, lights out."],
        ])
      : undefined;

    return { mode: "local", mirror, question, nudges };
  }

  if (mode === "untangle") {
    const mirror = [
      pick([
        "This reads like you’re trying to turn a knot into something you can hold.",
        "You’re doing the right move here: naming the knot instead of letting it stay foggy.",
      ]),
      a1 ? `The knot is: ${softEcho(a1, 120)}.` : null,
      a2 ? `What’s in your control vs not in your control: ${softEcho(a2, 160)}.` : null,
      a3
        ? pick([
            `The story your brain is telling makes sense as a protective reflex. (${softEcho(a3, 140)})`,
            `That thought is heavy to carry. Noticing it is already progress. (${softEcho(a3, 140)})`,
          ])
        : null,
      a4
        ? pick([
            `Your next step is refreshingly real. (${softEcho(a4, 110)})`,
            `That next step is the kind that creates traction. (${softEcho(a4, 110)})`,
          ])
        : null,
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n");

    const question = pick([
      "What’s the smallest piece of this that would change how you feel by 10%?",
      "If you assumed you don’t have to solve it today, what would you do next?",
    ]);

    const nudges = Math.random() < 0.35 ? pick([
      ["Write: ‘If this goes okay, what changes? If it goes badly, what’s still true?’"],
      ["Name one assumption you can test in 24 hours."],
    ]) : undefined;

    return { mode: "local", mirror, question, nudges };
  }

  // Default: Check-in or anything else.
  const mirror = [
    pick([
      "Thanks for checking in with yourself. This is the kind of small honesty that helps." ,
      "This reads like a clear snapshot — not dramatic, just real.",
    ]),
    a1 ? `How you’re doing: ${softEcho(a1, 120)}.` : null,
    a2 ? `What’s taking space: ${softEcho(a2, 140)}.` : null,
    a3 ? `What you need more of: ${softEcho(a3, 120)}.` : null,
    memLine,
  ].filter(Boolean).join("\n\n");

  const question = pick([
    "If you could meet one of those needs today, what’s the smallest way you’d do it?",
    "What would support look like in the next 24 hours — structure, rest, or connection?",
  ]);

  return { mode: "local", mirror, question };
}

export function generateLocalReflection(entryText: string, mem?: UserMemory): ReflectionOutput {
  const cleaned = normalize(entryText);

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
            "If you’re tired: “I’m exhausted because ___.”",
            "If you’re blank: “The main thing on my mind is ___.”",
          ],
        ]),
      };

      return { ...out, mirror: ensureSafetyNote(out.mirror, answerOnly || cleaned) };
    }

    const guidedTone = detectTone(answerOnly);
    const guidedTopic = detectTopic(answerOnly);
    const guidedMemLine = maybeMemoryLine(mem, answerOnly || cleaned, guidedTone, guidedTopic);
    const out = localGuidedSession(guided, guidedMemLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, answerOnly || cleaned) };
  }

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
  const memLine = maybeMemoryLine(mem, cleaned, tone, topic);

  // Archetype: unwind / destress / colliding thoughts
  if ((tone === "negative" || tone === "mixed" || tone === "neutral") && detectUnwindIntent(cleaned)) {
    const out = localUnwindDecompress(cleaned, memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  // Archetype: pattern-seeking (applies even if the topic classifier doesn't catch it)
  if (detectPatternSeeking(cleaned)) {
    const out = localPatternInsight(cleaned, memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }


  if (tone === "positive" && detectGoodNothingNew(cleaned)) {
    const out = localGoodNothingNew(memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  if (topic === "new_to_journaling") return localNewToJournaling(cleaned, memLine);
  if (topic === "mental_wellness") return localMentalWellness(cleaned, memLine);
  if (topic === "self_worth") {
    const out = localSelfWorth(cleaned, memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }
  if (topic === "finances" && (tone === "negative" || tone === "mixed")) {
    if (detectMoneyAffectingRelationships(cleaned)) {
      const out = localMoneyAffectingRelationships(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    const out = localFinances(cleaned, memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }
  if (topic === "relationships" && tone === "positive") return localRelationshipsPositive(cleaned, memLine);
  if (topic === "relationships") {
    if (detectSocialAvoidanceSpiral(cleaned)) {
      const out = localSocialAvoidanceSpiral(cleaned, memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectFamilyTension(cleaned)) {
      const out = localFamilyTension(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectFriendLowBandwidth(cleaned)) {
      const out = localFriendLowBandwidth(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectDatingFatigue(cleaned)) {
      const out = localDatingFatigue(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectRomanticUncertainty(cleaned)) {
      const out = localRomanticUncertainty(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectLonelyEvenWithPeople(cleaned)) {
      const out = localLoneliness(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectSolitudeVsIsolation(cleaned)) {
      const out = localSolitudeVsIsolation(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectComparisonBehind(cleaned)) {
      const out = localComparisonBehind(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectConflictAvoidance(cleaned)) {
      const out = localConflictAvoidance(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }
    if (detectRelationshipAsEscape(cleaned)) {
      const out = localRelationshipAsEscape(memLine);
      return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
    }

    const out = localRelationships(cleaned, memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }
  if (topic === "decisions") return localDecisions(memLine);
  if (topic === "anxiety_rumination") return localAnxiety(cleaned, memLine);
  if (topic === "wins_gratitude") return localWins(cleaned, memLine);

  if (topic === "food" && tone === "positive") return localFoodPositive(cleaned, memLine);

  if (topic === "health" && tone === "positive") return localHealthPositive(cleaned, memLine);

  if (topic === "work" && (tone === "negative" || tone === "mixed")) return localWorkStress(cleaned, memLine);

  // Positive hobby/joy entries (piano, art, skating, etc.) deserve richer local reflections.
  if (tone === "positive" && detectPositiveWinCategory(cleaned) === "hobby") {
    const out = localHobbyJoy(cleaned, memLine);
    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  if (tone === "positive") {
    const short = cleaned.length < 40;
    const anchor = extractAnchor(cleaned, 150);
    const out: ReflectionOutput = short
      ? {
          mode: "local",
          mirror: [
            pick([
              "That sounds like a small win, and it counts.",
              "Nice. Even a simple “good” day deserves a little space.",
              "I’m glad there was something good in there.",
            ]),
            anchor ? `What I’m picking up is: ${softEcho(anchor, 120)}.` : null,
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
            anchor ? `What I’m holding onto is the feeling of it: ${softEcho(anchor, 140).toLowerCase()}.` : null,
            memLine,
          ]
            .filter(Boolean)
            .join("\n\n"),
          question: Math.random() < 0.3 ? "What part do you want to remember most?" : undefined,
        };

    return { ...out, mirror: ensureSafetyNote(out.mirror, cleaned) };
  }

  if (tone === "negative" || tone === "mixed") {
    const anchor = extractAnchor(cleaned, 160);
    const out: ReflectionOutput = {
      mode: "local",
      mirror: [
        pick([
          "That sounds heavy — and it makes sense you’d feel weighed down by it.",
          "I hear how much this is taking out of you.",
          "That’s a lot to carry at once.",
        ]),
        anchor ? `The part I’m hearing most is: ${softEcho(anchor, 150)}.` : null,
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
  const anchor = extractAnchor(cleaned, 160);
  const out: ReflectionOutput = {
    mode: "local",
    mirror: [
      pick([
        "Got it. I’m here with you.",
        "Okay. I’m with you."
      ]),
      anchor ? `If we zoom in, it’s this: ${softEcho(anchor, 150)}.` : null,
      memLine,
    ]
      .filter(Boolean)
      .join("\n\n"),
    question: Math.random() < 0.45 ? pick([
      "Want to add one detail that makes this feel more like today?",
      "What’s the one part you’d want future-you to remember about this day?",
    ]) : undefined,
    nudges:
      Math.random() < 0.2
        ? ["You can keep it simple: Today felt ___ because ___."]
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

    const obj = (v: unknown): Record<string, unknown> | null =>
      v && typeof v === "object" ? (v as Record<string, unknown>) : null;
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
      parsedObj.question === null
        ? undefined
        : typeof parsedObj.question === "string"
        ? parsedObj.question.trim()
        : undefined;

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
