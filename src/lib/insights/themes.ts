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
  const scored = BUCKETS.map((b) => ({ id: b.id, label: b.label, s: b.score(t) }))
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

  const adviceTiny = "If it helps, aim for the tiny version (5–10 minutes). It counts.";

  switch (bucketId) {
    case "work":
      if (heavy) {
        return load >= 2
          ? "When work becomes time-pressure + stacked expectations, your tone drops fast. A useful experiment is to name the single bottleneck (deadline/meetings/people) and reduce just that one thing."
          : "Work shows up here as emotional load, not just tasks. The useful question is what part costs you most (uncertainty, people, or volume) so you can target that lever.";
      }
      if (light)
        return "When work feels structured/contained, your tone tends to lift. It may be worth noticing what made the day feel more manageable (clarity, pacing, support).";
      return matchCount >= 3
        ? "This theme repeats — it might be a primary stress channel. Watch for what reliably triggers it and what reliably softens it."
        : "Work appears here as a context driver. The details matter more than the label.";

    case "sleep":
      if (hasSleepDebt || heavy)
        return "Low sleep/low energy tends to magnify everything else. If you can’t fix sleep, aim for a smaller win (earlier wind-down, a 10-minute rest, or one less demand).";
      if (light)
        return "When energy is better, other themes feel easier. Protecting recovery seems high-leverage for you.";
      return "Energy is a capacity ceiling — it changes what’s possible on a given day.";

    case "selfcare":
      if (heavy) return `When things pile up, self-care is often the first thing that drops — and then the day feels sharper. ${adviceTiny}`;
      if (light)
        return "Small resets (movement, breathing, outside) show up as mood stabilizers for you. They seem to change the next hour, not just the day.";
      return "These are your stabilizers — the things that make everything else more workable.";

    case "relationships":
      if (hasAvoid)
        return "There’s a push‑pull in connection. When avoidance shows up, it can be protective — but it can also increase loneliness. Worth noticing which it is in the moment.";
      if (heavy)
        return "People-related stress tends to change your emotional temperature quickly. The useful question is whether the pain is distance, conflict, or feeling unseen.";
      if (light)
        return "Connecting with people reads like a real reset for you — not just “social”, but something that changes your baseline. If you want to keep that effect, a small check‑in can count (even if it’s not a big hangout).";
      return "Relationships are a strong mood lever — both positively and negatively depending on context.";

    case "finances":
      if (heavy)
        return "Money stress reads like safety stress. It can drain motivation because your brain treats it as urgency. A small stabilizer is turning “everything” into one next action (one bill, one call, one plan).";
      if (light)
        return "When stability improves, your tone tends to lift. It’s worth tracking which kinds of stability (buffer, clarity, income, support) matter most.";
      return "Money shows up here as emotional load. Clarity and small steps tend to help more than rumination.";

    case "selfworth":
      if (hasSelfCrit || heavy)
        return "Harsh self-talk tends to cluster when you’re depleted or under pressure. Often that’s a signal you need support or recovery — not more self-attack.";
      if (light)
        return "When self-talk is kinder, everything is easier to carry. It’s worth noticing what conditions make that possible (rest, progress, connection).";
      return "Your inner voice shows up as an active factor. Tracking when it turns sharp can reveal your triggers.";

    case "hobbies":
    case "outdoors":
      if (light) return "These moments tend to soften your day. They’re not ‘extra’ — they look like fuel.";
      if (heavy)
        return "When the week gets heavy, these tend to disappear. If you want change, reintroducing a tiny version can be a high-return move.";
      return "These are ‘texture’ themes — they can quietly shift your mood without needing a big life change.";

    case "therapy":
      return heavy
        ? "Support shows up when things are hard — that’s not failure, that’s strategy. The question is what you want support to do (validate, plan, process, regulate)."
        : "Support is part of your toolkit. Keeping it consistent tends to make other themes more manageable.";

    case "faith":
      return "This theme often appears when you’re seeking grounding or meaning. It can be stabilizing even when circumstances don’t change.";

    default:
      return heavy
        ? "This theme tends to appear on heavier days. The useful question is what makes it feel hard and what would make it 10% easier."
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

function tokenKey(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .filter(Boolean)
    .filter((w) => w.length >= 3)
    .filter((w) => !["the", "and", "but", "when", "this", "that", "with", "your", "you", "week", "shows", "showed", "show"].includes(w));
}

function jaccard(a: string[], b: string[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function dedupeSentences(text: string) {
  const sentences = sentenceSplit(text);
  const kept: string[] = [];
  const keptKeys: string[][] = [];

  for (const s of sentences) {
    const keys = tokenKey(s);
    const flat = keys.join(" ");
    if (!flat) {
      kept.push(s);
      keptKeys.push(keys);
      continue;
    }

    let redundant = false;
    for (let i = 0; i < kept.length; i++) {
      const prevKeys = keptKeys[i];
      const sim = jaccard(keys, prevKeys);
      if (sim >= 0.78) {
        redundant = true;
        break;
      }
      const prevNorm = normalize(kept[i]);
      const curNorm = normalize(s);
      if (prevNorm === curNorm) {
        redundant = true;
        break;
      }
      if ((prevNorm.includes(curNorm) || curNorm.includes(prevNorm)) && Math.abs(prevNorm.length - curNorm.length) <= 30) {
        redundant = true;
        break;
      }
    }

    if (!redundant) {
      kept.push(s);
      keptKeys.push(keys);
    }
  }

  return kept.join(" ").replace(/\s+/g, " ").trim();
}

function themeSummaryFromBucket(bucketId: string, bucketLabel: string, themeAvg: number, sampleText: string, matchCount: number) {
  const t = normalize(sampleText);
  const signals = unique(signalPhrasesForBucket(bucketId, t)).slice(0, 2);
  const signalClause = signals.length ? ` — especially around ${humanJoin(signals)}` : "";

  const heavy = themeAvg <= -0.9;
  const light = themeAvg >= 0.9;
  const repeats = matchCount >= 4;

  const insight = themeInsightFromBucket(bucketId, themeAvg, sampleText, matchCount);

  switch (bucketId) {
    case "sleep": {
      const opener = repeats
        ? `Sleep and energy kept coming up this week${signalClause}.`
        : `Sleep and energy showed up as a real limiter${signalClause}.`;
      const bridge = heavy
        ? "When you’re depleted, the same problems tend to feel louder."
        : "Energy acts like a ceiling — it quietly shapes what’s realistic on a given day.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
    case "work": {
      const opener = repeats
        ? `Work pressure repeated this week${signalClause}.`
        : `Work came up as pressure on your time${signalClause}.`;
      const bridge = heavy
        ? "It reads like your time was being pulled around by other people’s priorities."
        : light
        ? "When work feels contained, you tend to sound more like yourself."
        : "Work seems to act as a background driver for the whole day.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
    case "selfcare": {
      const opener = repeats
        ? `Your small resets showed up repeatedly${signalClause}.`
        : `Self-care and grounding showed up as the “small reset” layer${signalClause}.`;
      const bridge = heavy
        ? "When the week gets tight, this is often what drops first — and then the day feels harsher."
        : light
        ? "Even a small reset seems to shift your next hour, not just your day."
        : "These are the levers that make the rest of life more workable.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
    case "relationships": {
      const opener = repeats
        ? `Connection kept showing up this week${signalClause}.`
        : `Relationships and connection showed up as a real mood lever${signalClause}.`;
      const bridge = heavy
        ? "People dynamics can change your emotional temperature quickly."
        : light
        ? "When connection is good, it reads like a genuine reset for you."
        : "It’s not just social context — it’s part of how the week felt.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
    case "finances": {
      const opener = repeats
        ? `Money/stability kept coming up${signalClause}.`
        : `Money showed up less like math and more like stability${signalClause}.`;
      const bridge = heavy
        ? "When it spikes, it reads like safety stress — the kind that drains motivation."
        : light
        ? "When things feel steadier, your writing tends to lift."
        : "Clarity tends to help more than spinning on it.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
    case "selfworth": {
      const opener = repeats
        ? `Self-talk came up repeatedly${signalClause}.`
        : `Your inner voice showed up as part of the week${signalClause}.`;
      const bridge = heavy
        ? "When the tone is heavy, the self-criticism tends to get louder too."
        : light
        ? "When the self-talk is kinder, everything reads easier to carry."
        : "Noticing when it turns sharp is often the first clue to what you need.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
    default: {
      const opener = repeats ? `${bucketLabel} kept showing up this week${signalClause}.` : `${bucketLabel} showed up in your writing${signalClause}.`;
      const bridge = heavy ? "It tended to appear on heavier days." : light ? "It tended to appear on lighter days." : "The context around it matters more than the label.";
      return dedupeSentences(`${opener} ${bridge} ${insight}`);
    }
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
