import type { JournalEntry } from "../../types/journal";
import { LOAD_SIGNALS, cleanSnippet, normalize, unique } from "./shared";
import { scoreSentiment } from "./sentiment";

export type Theme = {
  id: string;
  label: string;
  score: number;
  examples: string[];
  summary: string;
};

type Bucket = {
  id: string;
  label: string;
  patterns: RegExp[];
  score: (t: string) => number;
  describe: (t: string) => string;
};

function countMatches(t: string, patterns: RegExp[]) {
  let c = 0;
  for (const p of patterns) if (p.test(t)) c++;
  return c;
}

function ensurePeriod(s: string) {
  const t = normalize(s);
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function firstSentence(text: string) {
  const parts = sentenceSplit(text);
  const first = parts[0] ?? normalize(text);
  return ensurePeriod(first);
}

function twoSentenceSummary(general: string, personal: string) {
  const a = ensurePeriod(firstSentence(general));
  const b = ensurePeriod(firstSentence(personal));
  return `${a} ${b}`.trim();
}

export function signalPhrasesForBucket(bucketId: string, t: string) {
  const out: string[] = [];
  const pushIf = (cond: boolean, label: string) => {
    if (cond) out.push(label);
  };

  switch (bucketId) {
    case "work":
      pushIf(/\bdeadline\b/.test(t), "deadline");
      pushIf(/\blast minute\b/.test(t), "last-minute changes");
      pushIf(/\bmeeting\b/.test(t), "meetings");
      pushIf(/\bmidnight\b/.test(t), "late-night meetings");
      pushIf(/\bclient\b/.test(t), "clients");
      pushIf(/\bboss\b/.test(t), "boss/authority pressure");
      pushIf(/\bovertime\b/.test(t), "overtime");
      pushIf(/\bover the weekend\b|\bweekend\b/.test(t), "weekend work");
      pushIf(/\bno time\b/.test(t), "time squeeze");
      pushIf(/\bpressure\b/.test(t), "pressure");
      return out;
    case "sleep":
      pushIf(/\binsomnia\b/.test(t), "insomnia");
      pushIf(/\bcan\'?t sleep\b/.test(t), "can’t sleep");
      pushIf(/\bwoke up\b/.test(t), "broken sleep");
      pushIf(/\btired\b/.test(t), "tired");
      pushIf(/\bexhaust/.test(t), "exhausted");
      pushIf(/\blow energy\b|\bno energy\b/.test(t), "low energy");
      return out;
    case "selfcare":
      pushIf(/\bwalk\b/.test(t), "walking");
      pushIf(/\bgym\b|\bworkout\b|\bexercise\b/.test(t), "exercise");
      pushIf(/\bmeditat/.test(t), "meditation");
      pushIf(/\bbreathe\b/.test(t), "breathing");
      pushIf(/\boutside\b|\bnature\b/.test(t), "outside time");
      return out;
    case "relationships":
      pushIf(/\bfamily\b|\bmom\b|\bdad\b|\bsister\b|\bbrother\b/.test(t), "family");
      pushIf(/\bfriend\b/.test(t), "friends");
      pushIf(/\bpartner\b|\brelationship\b/.test(t), "partner/relationship");
      pushIf(/\bavoid\b|\bignore\b/.test(t), "avoidance");
      return out;
    case "romance_dating":
      pushIf(/\b(seeing someone|person i'?m seeing|someone i'?m seeing|dating|apps?|swiping|first date|situationship|relationship)\b/.test(t), "romance/dating");
      pushIf(/\b(anxious|uneasy|nervous|uncertain|mixed signals|can'?t tell|cant tell)\b/.test(t), "uncertainty/anxiety");
      pushIf(/\b(exhausted|burnt|burned out|burnout|over it|give up)\b/.test(t), "dating fatigue");
      pushIf(/\b(married|engaged|moving in together)\b/.test(t), "milestone comparison");
      return out;
    case "loneliness_solitude":
      pushIf(/\b(lonely|unseen|left out)\b/.test(t), "loneliness");
      pushIf(/\b(even though i talked to people|around people but)\b/.test(t), "lonely around people");
      pushIf(/\b(part of me likes it|another part worries|worry i'?m isolating|worried i'?m isolating)\b/.test(t), "solitude vs isolation");
      return out;
    case "family_dynamics":
      pushIf(/\b(parents?|mom|mum|dad|family)\b/.test(t), "family conversations");
      pushIf(/\b(judg|judged|critic|disappoint|tone)\b/.test(t), "feeling judged");
      pushIf(/\b(stuck with me|lingered|can'?t shake|still sitting with me)\b/.test(t), "it lingered");
      return out;
    case "friendship_tension":
      pushIf(/\bfriends?\b/.test(t), "friends");
      pushIf(/\b(annoy|annoyed|impatient|irritat|short with|snappy)\b/.test(t), "low bandwidth / irritation");
      pushIf(/\b(didn'?t want to be around anyone|dont want to be around anyone|wanted to be alone)\b/.test(t), "withdrawing");
      return out;
    case "financial_relationships":
      pushIf(/\b(money|rent|debt|bills|budget|paycheck)\b/.test(t), "money stress");
      pushIf(/\b(short with|snappy|snap|irritable|tense)\b/.test(t), "leaking into patience");
      pushIf(/\b(people|friends?|family|partner)\b/.test(t), "with people");
      return out;
    case "finances":
      pushIf(/\brent\b/.test(t), "rent");
      pushIf(/\bdebt\b/.test(t), "debt");
      pushIf(/\bbills\b/.test(t), "bills");
      pushIf(/\bmoney\b/.test(t), "money");
      return out;
    case "selfworth":
      pushIf(/\bnot good enough\b/.test(t), "not good enough");
      pushIf(/\bhate myself\b/.test(t), "self-criticism");
      pushIf(/\bworthless\b/.test(t), "worthless");
      pushIf(/\bshame\b/.test(t), "shame");
      pushIf(/\bguilt\b/.test(t), "guilt");
      return out;
    default:
      return out;
  }
}

const BUCKETS: Bucket[] = [
  {
    id: "work",
    label: "Work pressure & time",
    patterns: [
      /\bboss\b/i,
      /\bmeeting\b/i,
      /\bclient\b/i,
      /\bdeadline\b/i,
      /\bovertime\b/i,
      /\bweekend\b/i,
      /\blast minute\b/i,
      /\bno time\b/i,
      /\bpressure\b/i,
      /\bworkload\b/i,
      /\bjob\b/i,
      /\bshift\b/i,
      /\bcoworker(s)?\b/i,
      /\bat work\b/i,
    ],
    score: (t) => {
      const idiomOnly = /\bwork (things|it) out\b|\bwork on (myself|me)\b/.test(t);
      const hasStrong =
        /\bboss\b|\bmeeting\b|\bclient\b|\bdeadline\b|\bovertime\b|\bworkload\b|\bcoworker(s)?\b|\bshift\b|\bat work\b|\bjob\b|\boffice\b/.test(
          t
        );

      if (idiomOnly && !hasStrong) return 0;
      const workWord = /\bwork\b/.test(t);
      const safeWork = workWord && (/\bat work\b|\bworkload\b|\bworkday\b|\bjob\b|\boffice\b/.test(t) || hasStrong);

      let s = 0;
      if (safeWork) s += 1;
      s += countMatches(t, [
        /\bboss\b/i,
        /\bmeeting\b/i,
        /\bclient\b/i,
        /\bdeadline\b/i,
        /\bno time\b/i,
        /\bpressure\b/i,
        /\bovertime\b/i,
        /\bworkload\b/i,
      ]);
      return s;
    },
    describe: (t) => {
      if (t.includes("no time") || t.includes("time isnt mine") || t.includes("time isn't mine")) {
        return "It isn’t just tasks — it’s the feeling that your time belongs to work right now.";
      }
      if (t.includes("last minute")) return "Last-minute changes show up as a real stress amplifier for you.";
      return "Work shows up here as load + expectations, not just a schedule.";
    },
  },
  {
    id: "relationships",
    label: "Relationships & connection",
    patterns: [
      /\bfriend(s)?\b/i,
      /\bpartner\b/i,
      /\brelationship\b/i,
      /\bfamily\b/i,
      /\bmom\b|\bdad\b|\bsister\b|\bbrother\b/i,
      /\bhang out\b/i,
    ],
    score: (t) => {
      const isWorkCall = /client call|business call|work call/.test(t);
      let s = 0;
      if (/\bfriend(s)?\b/.test(t)) s += 2;
      if (/\bfamily\b|\bmom\b|\bdad\b|\bsister\b|\bbrother\b/.test(t)) s += 2;
      if (/\bpartner\b|\brelationship\b/.test(t)) s += 2;
      if (/\bhang out\b/.test(t)) s += 1.5;
      if (!isWorkCall && (/\bcall(ed)?\b|\btext(ed)?\b/.test(t))) {
        if (
          /\b(my|a) (friend|mom|dad|sister|brother|partner)\b/.test(t) ||
          /\bfriend\b|\bfamily\b|\bpartner\b|\brelationship\b|\bhang out\b/.test(t)
        ) {
          s += 1;
        }
      }
      return s;
    },
    describe: (t) => {
      if (t.includes("avoid") || t.includes("ignore")) return "There’s a push-pull here: wanting connection, but also wanting distance.";
      if (t.includes("hang out") || t.includes("caught up")) return "Connection reads as a real reset in your week, not just a social detail.";
      return "People are showing up as an emotional variable — energizing sometimes, complicated other times.";
    },
  },

  // New: Relationship-focused sub-themes (a single entry can hit multiple buckets)
  {
    id: "romance_dating",
    label: "Romance & dating",
    patterns: [
      /\b(seeing someone|person i'?m seeing|someone i'?m seeing|dating|date|dates|app|apps|swiping|situationship|relationship|partner|crush)\b/i,
      /\b(anxious|anxiety|uneasy|nervous|uncertain|mixed signals|can'?t tell|cant tell)\b/i,
      /\b(exhaust|burnt|burned out|burnout|worn down|over it|give up)\b/i,
      /\b(married|engaged|moving in together)\b/i,
    ],
    score: (t) => {
      const romanticContext =
        /\b(seeing someone|person i'?m seeing|someone i'?m seeing|dating|date|dates|apps?|swiping|situationship|crush|relationship|partner)\b/.test(t);
      const uncertainty = /\b(anxious|anxiety|uneasy|nervous|uncertain|mixed signals|can'?t tell|cant tell|no clear reason)\b/.test(t);
      const fatigue = /\b(exhaust|exhausting|tired|burnt|burned out|burnout|worn down|over it|give up)\b/.test(t);
      const wantsConnection = /\b(want connection|want closeness|want a relationship|want someone)\b/.test(t);
      const milestoneCompare = /\b(friends?|people)\b/.test(t) && /\b(married|engaged|moving in together)\b/.test(t) && /\b(behind|falling behind|left behind)\b/.test(t);

      let s = 0;
      if (romanticContext) s += 2;
      if (uncertainty) s += 1.5;
      if (fatigue) s += 1.5;
      if (wantsConnection) s += 1;
      if (milestoneCompare) s += 2;

      // Avoid labeling purely on one word like "date" with no emotional signal.
      if (romanticContext && (uncertainty || fatigue || wantsConnection || milestoneCompare)) return s;
      return 0;
    },
    describe: () => "Romance and dating can bring a mix of hope, uncertainty, and longing for connection.",
  },
  {
    id: "loneliness_solitude",
    label: "Loneliness & solitude",
    patterns: [
      /\b(lonely|loneliness|unseen|left out)\b/i,
      /\b(even though i talked to people|around people)\b/i,
      /\b(alone|by myself|on my own|solitude)\b/i,
      /\b(isolat|isolating|withdrawing)\b/i,
      /\b(part of me|another part)\b/i,
    ],
    score: (t) => {
      const lonely = /\b(lonely|loneliness|unseen|left out)\b/.test(t);
      const aroundPeople = /\b(talked to people|was with people|around people|hung out|saw people)\b/.test(t);
      const unclearWhy = /\b(don'?t know why|dont know why|no clear reason)\b/.test(t);

      const alone = /\b(alone|by myself|on my own|solitude)\b/.test(t);
      const isolatingWorry = /\b(isolat|isolating|withdrawing)\b/.test(t);
      const ambivalence = /\b(part of me|another part|but)\b/.test(t);
      const likesSolitude = /\b(part of me likes|i like it|enjoy it)\b/.test(t);

      let s = 0;
      // Loneliness despite contact (requires more than just the word “lonely”)
      if (lonely && aroundPeople) s += 3;
      if (lonely && (unclearWhy || /\beven though\b/.test(t))) s += 1;

      // Solitude vs isolation (requires ambivalence + isolation signal)
      if (alone && isolatingWorry && ambivalence) s += 3;
      if (likesSolitude && isolatingWorry) s += 1;

      return s;
    },
    describe: () => "Loneliness and solitude are different experiences, and it’s normal to feel pulled between connection and independence.",
  },
  {
    id: "family_dynamics",
    label: "Family dynamics",
    patterns: [
      /\b(parents?|mom|mum|dad|family)\b/i,
      /\b(judg|judged|critic|disappoint|tense|weird)\b/i,
      /\b(stuck with me|lingered|can'?t shake|kept thinking)\b/i,
      /\b(call|talked)\b/i,
    ],
    score: (t) => {
      const family = /\b(parents?|mom|mum|dad|family)\b/.test(t);
      const contact = /\b(call|called|talked|conversation)\b/.test(t);
      const judged = /\b(judg|judged|judgment|critic|disappoint|tone|weird|tense)\b/.test(t);
      const lingering = /\b(stuck with me|lingered|can'?t shake|kept thinking|still thinking|longer than i expected)\b/.test(t);

      if (!family) return 0;
      let s = 0;
      if (contact) s += 1;
      if (judged) s += 2;
      if (lingering) s += 2;

      // Require at least two signals beyond the family word itself.
      return s >= 3 ? s : 0;
    },
    describe: () => "Family dynamics often carry history and subtext, which can make even “normal” conversations feel loaded.",
  },
  {
    id: "friendship_tension",
    label: "Friendship tension",
    patterns: [
      /\bfriends?\b/i,
      /\b(annoy|annoyed|impatient|irritat|short with|snappy)\b/i,
      /\b(didn'?t want to be around|dont want to be around|wanted to be alone)\b/i,
      /\b(drained|low bandwidth|no energy)\b/i,
    ],
    score: (t) => {
      const friends = /\bfriends?\b/.test(t);
      const irritation = /\b(annoy|annoyed|impatient|irritat|short with|snappy)\b/.test(t);
      const withdraw = /\b(didn'?t really want to be around|did not really want to be around|don'?t want to be around|dont want to be around|wanted to be alone)\b/.test(t);
      const lowBandwidth = /\b(drained|low bandwidth|no energy|too tired|wiped)\b/.test(t);

      if (!friends) return 0;
      let s = 0;
      if (irritation) s += 2;
      if (withdraw) s += 2;
      if (lowBandwidth) s += 1;

      // Avoid labeling just because "friends" appears.
      return s >= 2 ? s : 0;
    },
    describe: () => "Friendship tension is often less about the people and more about capacity, stress, and unmet needs.",
  },
  {
    id: "financial_relationships",
    label: "Financial stress affecting relationships",
    patterns: [
      /\b(money|rent|debt|bills|budget|paycheck)\b/i,
      /\b(short with|snappy|snap|irritable|tense)\b/i,
      /\b(people|friends?|family|partner|relationship)\b/i,
    ],
    score: (t) => {
      const money = /\b(finance|finances|money|rent|debt|bills|paycheck|pay|broke|budget)\b/.test(t);
      const people = /\b(people|friends?|family|partner|relationship)\b/.test(t);
      const leak = /\b(short with|snappy|snap|irritable|tense|impatient)\b/.test(t);

      if (!(money && people && leak)) return 0;
      return 4;
    },
    describe: () => "Money stress isn’t just numbers; it can leak into patience, closeness, and how safe you feel with other people.",
  },
  {
    id: "selfcare",
    label: "Self-care & grounding",
    patterns: [
      /\bwalk\b/i,
      /\bgym\b/i,
      /\bworkout\b/i,
      /\bexercise\b/i,
      /\bstretch\b/i,
      /\bmeditat/i,
      /\bbreathe\b/i,
      /\bshower\b|\bbath\b/i,
      /\bmusic\b/i,
      /\boutside\b|\bnature\b/i,
    ],
    score: (t) => countMatches(t, [/\bwalk\b/i, /\bexercise\b/i, /\bgym\b/i, /\bmeditat/i, /\bmusic\b/i, /\boutside\b/i]),
    describe: (t) => {
      if (t.includes("didnt exercise") || t.includes("didn't exercise")) return "When things pile up, self-care seems to be the first thing that drops.";
      if (t.includes("walk")) return "Movement shows up as a stabilizer you naturally reach for.";
      return "These are your “small resets” — the things that change how the next hour feels.";
    },
  },
  {
    id: "sleep",
    label: "Sleep & energy",
    patterns: [/\bsleep\b/i, /\binsomnia\b/i, /\btired\b/i, /\bexhaust/i, /\brest\b/i, /\benergy\b/i],
    score: (t) => countMatches(t, [/\bsleep\b/i, /\btired\b/i, /\bexhaust/i]),
    describe: () => "Energy and recovery show up as a real limiter. When this theme spikes, everything else gets harder.",
  },
  {
    id: "finances",
    label: "Money & stability",
    patterns: [/\bfinance\b/i, /\bmoney\b/i, /\brent\b/i, /\bdebt\b/i, /\bbills\b/i, /\bpay\b/i],
    score: (t) => countMatches(t, [/\bfinance\b/i, /\bmoney\b/i, /\brent\b/i, /\bdebt\b/i, /\bbills\b/i]),
    describe: () => "This reads less like math and more like safety. Money stress tends to spill into mood and motivation.",
  },
  {
    id: "selfworth",
    label: "Self-talk & confidence",
    patterns: [/\bnot good enough\b/i, /\bhate myself\b/i, /\bworthless\b/i, /\bfailure\b/i, /\bshame\b/i, /\bguilt\b/i],
    score: (t) => countMatches(t, [/\bnot good enough\b/i, /\bfailure\b/i, /\bshame\b/i, /\bguilt\b/i]),
    describe: () => "This theme shows up when your inner voice gets sharp. Noticing it is the first step to changing it.",
  },

  // Additional, tighter themes
  {
    id: "health",
    label: "Health & body",
    patterns: [/\bsick\b/i, /\bheadache\b/i, /\bmigraine\b/i, /\bpain\b/i, /\bdoctor\b/i, /\bmeds?\b/i],
    score: (t) => countMatches(t, [/\bheadache\b/i, /\bmigraine\b/i, /\bdoctor\b/i, /\bpain\b/i, /\bsick\b/i]),
    describe: () => "When your body is off, it tends to color everything else. This theme usually means the day needed gentler expectations.",
  },
  {
    id: "home",
    label: "Home & life admin",
    patterns: [/\bclean(ing|ed)?\b/i, /\bchores?\b/i, /\blaundry\b/i, /\bdishes\b/i, /\bapartment\b/i, /\broom\b/i],
    score: (t) => countMatches(t, [/\bchores?\b/i, /\blaundry\b/i, /\bdishes\b/i, /\bclean(ing|ed)?\b/i]),
    describe: () => "This is the ‘keep life moving’ layer. When it stacks up, it can quietly drain energy; when it’s handled, it can feel grounding.",
  },
  {
    id: "hobbies",
    label: "Hobbies & joy",
    patterns: [
      /\b(read(ing)?|book|novel)\b/i,
      /\b(anime|kpop|drama)\b/i,
      /\b(movie(s)?|cinema|theater)\b/i,
      /\b(game(s)?|gaming)\b/i,
      /\bphoto(graphy)?|camera|take photos\b/i,
      /\b(dance|skate|skating|ice skating|figure skating)\b/i,
    ],
    score: (t) =>
      countMatches(t, [
        /\bbook\b/i,
        /\breading\b/i,
        /\banime\b/i,
        /\bkpop\b/i,
        /\bmovie(s)?\b/i,
        /\bphoto(graphy)?\b/i,
        /\bdance\b/i,
        /\bskating\b/i,
      ]),
    describe: () => "These are ‘spark’ moments — things that give texture to the day beyond obligations. Noting them helps you see what refuels you.",
  },
  {
    id: "outdoors",
    label: "Outdoors & nature",
    patterns: [/\bhike\b/i, /\bforest\b/i, /\btrail\b/i, /\bpark\b/i, /\bbeach\b/i, /\bnature\b/i],
    score: (t) => countMatches(t, [/\bhike\b/i, /\bforest\b/i, /\btrail\b/i, /\bpark\b/i, /\bbeach\b/i]),
    describe: () => "Getting outside reads like a nervous-system reset for you. Even brief contact with nature can change the tone of the day.",
  },
  {
    id: "travel",
    label: "Exploring & travel",
    patterns: [/\btravel\b/i, /\btrip\b/i, /\bvacation\b/i, /\bexplor(e|ing)\b/i, /\badventur(e|ing)\b/i],
    score: (t) => countMatches(t, [/\btravel\b/i, /\btrip\b/i, /\bvacation\b/i, /\bexplor(e|ing)\b/i, /\badventur(e|ing)\b/i]),
    describe: () => "This theme shows up when you’re seeking novelty or space. It often pairs with either excitement or escape — the context matters.",
  },
  {
    id: "pets",
    label: "Animals & comfort",
    patterns: [/\bdog\b/i, /\bcat\b/i, /\bpet(s)?\b/i, /\banimal(s)?\b/i],
    score: (t) => countMatches(t, [/\bdog\b/i, /\bcat\b/i, /\bpet(s)?\b/i]),
    describe: () => "Animals often show up as simple comfort — presence without pressure. When this appears, it’s usually a softening factor.",
  },
  {
    id: "faith",
    label: "Faith & meaning",
    patterns: [/\bpray(ing)?\b/i, /\bchurch\b/i, /\bservice\b/i, /\bspiritual\b/i],
    score: (t) => countMatches(t, [/\bpray(ing)?\b/i, /\bchurch\b/i, /\bspiritual\b/i]),
    describe: () => "This shows up when you’re looking for grounding, meaning, or something bigger than the day. It can be stabilizing even when life is noisy.",
  },
  {
    id: "therapy",
    label: "Therapy & support",
    patterns: [/\btherap(y|ist)\b/i, /\bcounsel(or|ing)\b/i, /\btherapy\b/i],
    score: (t) => countMatches(t, [/\btherap(y|ist)\b/i, /\bcounsel(or|ing)\b/i]),
    describe: () => "Support systems are part of your toolkit. When this theme appears, it usually means you’re actively working on patterns, not just surviving them.",
  },
  {
    id: "learning",
    label: "Learning & growth",
    patterns: [/\bstudy(ing)?\b/i, /\bclass\b/i, /\bschool\b/i, /\bcourse\b/i, /\bpractice\b/i],
    score: (t) => countMatches(t, [/\bstudy(ing)?\b/i, /\bclass\b/i, /\bcourse\b/i, /\bpractice\b/i]),
    describe: () => "This theme tends to show up when you’re investing in your future self. It can be energizing — or heavy if it’s stacked on top of everything else.",
  },
  {
    id: "kids",
    label: "Kids & caretaking",
    patterns: [/\bkid(s)?\b/i, /\bchild(ren)?\b/i, /\bson\b/i, /\bdaughter\b/i, /\bbaby\b/i],
    score: (t) => countMatches(t, [/\bkid(s)?\b/i, /\bchild(ren)?\b/i, /\bson\b/i, /\bdaughter\b/i, /\bbaby\b/i]),
    describe: () => "Caretaking has its own weight. When it shows up, the day’s capacity is often shaped by other people’s needs — not just your own.",
  },
];

export function topBucketsForText(t: string, topN = 2) {
  const nt = normalize(t);
  const scored = BUCKETS.map((b) => ({ id: b.id, label: b.label, s: b.score(nt) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topN);
  return scored;
}

function themeInsightFromBucket(bucketId: string, themeAvg: number, sampleText: string, matchCount: number) {
  const t = normalize(sampleText);
  const load = LOAD_SIGNALS.reduce((acc, s) => (t.includes(s) ? acc + 1 : acc), 0);
  const hasAvoid = /\bavoid\b|\bignore\b|\bghost\b/.test(t);
  const hasSleepDebt = /\binsomnia\b|\bpoor sleep\b|\bcan\'?t sleep\b|\bwoke up\b|\btired\b|\bexhaust/.test(t);
  const hasSelfCrit = /\bhate myself\b|\bworthless\b|\bfailure\b|\bnot good enough\b|\bshame\b|\bguilt\b/.test(t);

  const heavy = themeAvg <= -0.9;
  const light = themeAvg >= 0.9;

  const gentleTiny = "Sometimes the tiniest version of care is the most realistic.";

  switch (bucketId) {
    case "work":
      if (heavy) {
        return load >= 2
          ? "When work becomes time-pressure plus stacked expectations, your tone drops fast. The hard part seems less about effort and more about the constant pull on your time."
          : "Work shows up here as emotional load, not just tasks. The pattern seems to be volume plus expectation, not a single isolated moment.";
      }
      if (light)
        return "When work feels structured/contained, your tone tends to lift. Days with clarity, pacing, or support read as more manageable for you.";
      return matchCount >= 3
        ? "This theme repeats — it might be a primary stress channel. It often has reliable triggers and reliable softeners." 
        : "Work appears here as a context driver. The details matter more than the label.";

    case "sleep":
      if (hasSleepDebt || heavy)
        return "Low sleep/low energy tends to magnify everything else. When capacity is low, the same problems can feel louder and less solvable.";
      if (light)
        return "When energy is better, other themes feel easier. Recovery seems to change what’s emotionally carryable for you.";
      return "Energy is a capacity ceiling — it changes what’s possible on a given day.";

    case "selfcare":
      if (heavy) return `When things pile up, self-care is often the first thing that drops — and then the day feels sharper. ${gentleTiny}`;
      if (light)
        return "Small resets (movement, breathing, outside) show up as mood stabilizers for you. They seem to change the next hour, not just the day.";
      return "These are your stabilizers — the things that make everything else more workable.";

    case "relationships":
      if (hasAvoid)
        return "There’s a push‑pull in connection. When avoidance shows up, it can be protective — and it can also increase loneliness; the difference is often how you feel afterward.";
      if (heavy)
        return "People-related stress tends to change your emotional temperature quickly. It seems to cluster around distance, conflict, or feeling unseen.";
      if (light)
        return "Connecting with people reads like a real reset for you — not just social, but something that changes your baseline.";
      return "Relationships are a strong mood lever — both positively and negatively depending on context.";

    case "finances":
      if (heavy)
        return "Money stress reads like safety stress. It can drain motivation because your brain treats it as urgency, even when you’re trying to stay calm.";
      if (light)
        return "When stability improves, your tone tends to lift. Different kinds of stability (buffer, clarity, income, support) seem to matter in different ways for you.";
      return "Money shows up here as emotional load. Clarity and small steps tend to help more than rumination.";

    case "selfworth":
      if (hasSelfCrit || heavy)
        return "Harsh self-talk tends to cluster when you’re depleted or under pressure. It often shows up as a warning light, not a verdict about you.";
      if (light)
        return "When self-talk is kinder, everything is easier to carry. It’s worth noticing what conditions make that possible (rest, progress, connection).";
      return "Your inner voice shows up as an active factor. Tracking when it turns sharp can reveal your triggers.";

    case "romance_dating":
      return heavy
        ? "Connection is showing up alongside uncertainty. That mix can feel activating even when nothing is clearly ‘wrong’."
        : "Romance/dating shows up as a place where hope and nerves can coexist. A detail that seems to matter is how your body reacts, not just what happens on paper.";

    case "loneliness_solitude":
      return heavy
        ? "This looks like loneliness that isn’t fixed by being around people. That usually points to missing closeness or feeling understood, not just missing company."
        : "There’s ambivalence here: solitude can be restorative and also a little worrying. Noticing that balance is a sign you’re learning what you actually need.";

    case "family_dynamics":
      return heavy
        ? "Family shows up here through subtext and judgment, not big events. That can linger because it touches identity and approval."
        : "Family dynamics can be emotionally loud even when the conversation is ‘fine’. It’s the history that makes it sticky.";

    case "friendship_tension":
      return heavy
        ? "This reads like low bandwidth leaking into irritation. That doesn’t mean you don’t care; it usually means you’re stretched."
        : "Friend dynamics show up as an energy story. When capacity is low, even normal social contact can feel like too much.";

    case "financial_relationships":
      return "Money stress is showing up not only as worry, but as tension with people. That spillover is common when your nervous system is on high alert.";

    case "hobbies":
    case "outdoors":
      if (light) return "These moments tend to soften your day. They’re not ‘extra’ — they look like fuel.";
      if (heavy)
        return "When the week gets heavy, these tend to disappear. That pattern can matter because these moments often act like fuel.";
      return "These are ‘texture’ themes — they can quietly shift your mood without needing a big life change.";

    case "therapy":
      return heavy
        ? "Support shows up when things are hard — that’s not failure, that’s strategy. It reads like you’re using support for validation, planning, processing, or regulation."
        : "Support is part of your toolkit. Keeping it consistent tends to make other themes more manageable.";

    case "faith":
      return "This theme often appears when you’re seeking grounding or meaning. It can be stabilizing even when circumstances don’t change.";

    default:
      return heavy
        ? "This theme tends to appear on heavier days. The hard part seems to be what makes it feel tight or unsustainable."
        : light
        ? "This theme tends to show up on lighter days. It may be worth noticing what conditions make it easier."
        : "This theme is present; the context around it is what matters.";
  }
}

function humanJoin(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function sentenceSplit(text: string) {
  const s = text.trim();
  if (!s) return [];

  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    buf += ch;
    const isEnd = ch === "." || ch === "!" || ch === "?";
    const next = s[i + 1] ?? "";
    if (isEnd && (next === " " || next === "\n" || next === "\t" || next === "")) {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

function themeSummaryFromBucket(bucketId: string, bucketLabel: string, themeAvg: number, sampleText: string, matchCount: number) {
  const t = normalize(sampleText);
  const signals = unique(signalPhrasesForBucket(bucketId, t)).slice(0, 2);
  const signalClause = signals.length ? `especially around ${humanJoin(signals)}` : "";
  const repeats = matchCount >= 4;

  const insight = themeInsightFromBucket(bucketId, themeAvg, sampleText, matchCount);
  const insightClause = normalize(firstSentence(insight)).replace(/[.!?]$/, "").trim();

  // Requirement: every summary is exactly 2 sentences:
  // (1) general description of the theme, (2) how it shows up for THIS user recently.
  // Keep it growth-oriented and non-diagnostic; avoid generic filler.
  const personalizationLead = repeats
    ? "In your recent entries, this came up repeatedly"
    : "In your recent entries, this showed up";
  const signalBit = signalClause ? ` (${signalClause})` : "";

  switch (bucketId) {
    case "romance_dating":
      return twoSentenceSummary(
        "Romance and dating can bring a mix of hope, uncertainty, and longing for connection.",
        `${personalizationLead}${signalBit}, and the emotional tone reads like ambivalence rather than a simple yes/no; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "loneliness_solitude":
      return twoSentenceSummary(
        "Loneliness and solitude are different experiences, and it’s normal to feel pulled between connection and independence.",
        `${personalizationLead}${signalBit}, suggesting you’re paying attention to the line between restorative alone time and isolating drift; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "family_dynamics":
      return twoSentenceSummary(
        "Family dynamics often carry history and subtext, which can make even normal conversations feel loaded.",
        `${personalizationLead}${signalBit}, and what stands out is how the feeling lingers even without a clear incident; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "friendship_tension":
      return twoSentenceSummary(
        "Friendship tension is often less about the people and more about capacity, stress, and unmet needs.",
        `${personalizationLead}${signalBit}, and it reads like low bandwidth affecting patience more than a lack of care; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "financial_relationships":
      return twoSentenceSummary(
        "Money stress isn’t just numbers; it can leak into patience, closeness, and how safe you feel with other people.",
        `${personalizationLead}${signalBit}, and the pattern is the stress spilling over into how you relate to others day-to-day; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "relationships":
      return twoSentenceSummary(
        "Relationships are a major part of emotional life, and it’s normal for connection to feel both nourishing and complicated at different times.",
        `${personalizationLead}${signalBit}, and your writing suggests you’re tracking the push-pull between closeness, distance, and feeling understood; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "finances":
      return twoSentenceSummary(
        "Money and stability affect more than budgets; they influence safety, mood, and decision-making.",
        `${personalizationLead}${signalBit}, and it reads like uncertainty is doing more harm than the numbers themselves; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "work":
      return twoSentenceSummary(
        "Work pressure often shows up as time pressure, expectation, and lack of recovery.",
        `${personalizationLead}${signalBit}, and it reads like the drain is coming from constant demand rather than one-off problems; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "sleep":
      return twoSentenceSummary(
        "Sleep and energy shape what’s possible on any given day.",
        `${personalizationLead}${signalBit}, and when energy dips, other stressors seem to hit harder; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "selfcare":
      return twoSentenceSummary(
        "Self-care and grounding are the small stabilizers that change how the next hour feels.",
        `${personalizationLead}${signalBit}, and the pattern suggests you’re learning which tiny resets actually shift your baseline; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    case "selfworth":
      return twoSentenceSummary(
        "Self-talk matters because it changes how you interpret everything else.",
        `${personalizationLead}${signalBit}, and the sharpness seems to rise when you’re depleted or under pressure; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );

    default:
      return twoSentenceSummary(
        `${bucketLabel} is a recurring life context that can shape mood and capacity.`,
        `${personalizationLead}${signalBit}, and the way you describe it suggests the context matters more than the label; ${insightClause.charAt(0).toLowerCase() + insightClause.slice(1)}.`
      );
  }
}

export function extractThemes(entries: JournalEntry[], topK = 6): Theme[] {
  const recent = entries.slice(0, 35);
  if (!recent.length) return [];

  const scored = BUCKETS.map((b) => {
    let total = 0;
    let toneSum = 0;
    let toneN = 0;
    const matches: { t: string; raw: string; s: number }[] = [];

    for (const e of recent) {
      const t = normalize(e.text);
      if (b.id === "relationships" && /client call|business call|work call/.test(t)) {
        if (!/\bfriend|family|partner|relationship|hang out\b/.test(t)) continue;
      }

      const s = b.score(t);
      if (s > 0) {
        total += 1;
        matches.push({ t, raw: e.text, s });
        toneSum += scoreSentiment(e.text);
        toneN += 1;
      }
    }

    matches.sort((a, c) => c.s - a.s);

    const examples = matches.slice(0, 2).map((m) => cleanSnippet(m.raw));
    const themeAvg = toneN ? toneSum / toneN : 0;

    const sampleText = matches[0]?.raw ?? "";
    const summary = themeSummaryFromBucket(b.id, b.label, themeAvg, sampleText, total);

    return { bucket: b, total, examples, summary };
  })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, topK);

  return scored.map((x) => ({
    id: x.bucket.id,
    label: x.bucket.label,
    score: x.total,
    examples: x.examples,
    summary: x.summary,
  }));
}
