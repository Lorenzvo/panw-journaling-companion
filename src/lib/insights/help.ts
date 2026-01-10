import type { UserMemory } from "../../types/memory";
import type { DayPoint } from "./types";

export type HelpItem = { label: string; detail: string };

function canonicalHelp(label: string) {
  const t = label.toLowerCase();
  if (/(walk|walking|movement|move|exercise|run|gym|workout|stretch)/.test(t)) return "Movement";
  if (/(music|song|playlist|listen)/.test(t)) return "Music";
  if (/(sleep|rest|nap|relax|relaxing|do nothing|nothing|chill)/.test(t)) return "Rest";
  if (/(friend|friends|family|hang out|talk|talking|call|text|catch up|see people)/.test(t)) return "Connection";
  if (/(write|journal|reflect)/.test(t)) return "Writing it out";
  if (/(read|reading|book|novel)/.test(t)) return "Reading";
  if (/(tv|show|series|movie|cinema|theater|anime|drama)/.test(t)) return "Shows & movies";
  if (/(cook|cooking|bake|baking|meal|dinner|lunch|breakfast)/.test(t)) return "Food";
  if (/(clean|cleaning|tidy|organize|laundry|dishes)/.test(t)) return "Resetting your space";
  if (/(pray|prayer|church|service|spiritual)/.test(t)) return "Faith";
  if (/(therap(y|ist)|counsel(or|ing))/i.test(t)) return "Therapy";
  if (/(pet|dog|cat|animal)/.test(t)) return "Animals";
  if (/(beach|forest|trail|hike|park|nature|outside)/.test(t)) return "Outdoors";
  if (/(dance|swim|swimming|skate|skating|ice skating|figure skating)/.test(t)) return "Play";
  if (/(photo|photography|camera|take photos)/.test(t)) return "Photography";
  if (/(travel|trip|explor(e|ing)|adventur(e|ing))/i.test(t)) return "Exploring";
  return label;
}

function pickSpecificLike(likes: string[] | undefined, re: RegExp) {
  const list = (likes ?? []).map((x) => x.trim()).filter(Boolean);
  return list.find((x) => re.test(x.toLowerCase()));
}

export function whatHelped(memory: UserMemory, timeline: DayPoint[]): HelpItem[] {
  const raw = (memory.coping ?? []).slice(0, 10);
  const canon = new Map<string, number>();

  for (const r of raw) {
    const c = canonicalHelp(r);
    canon.set(c, (canon.get(c) ?? 0) + 1);
  }

  const ranked = Array.from(canon.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const items: HelpItem[] = ranked.map(([label]) => {
    const likes = memory.likes ?? [];
    switch (label) {
      case "Movement":
        return { label: "Movement & reset", detail: "This tends to help you come back to yourself, especially when your head feels loud." };
      case "Music":
        return { label: "Music", detail: "A quick way to change the texture of the moment without needing to solve anything." };
      case "Rest":
        return { label: "Rest & recovery", detail: "When energy is low, recovery usually helps more than pushing harder." };
      case "Connection":
        return { label: "Connection", detail: "When it’s available, people can soften the edge of a hard day." };
      case "Writing it out":
        return { label: "Writing it out", detail: "Getting it out of your head seems to reduce the pressure a bit." };
      case "Reading":
        return { label: "Reading", detail: "This shows up as a quiet focus-switch for you — attention moves from rumination to a storyline or idea." };
      case "Shows & movies": {
        const fav = pickSpecificLike(likes, /(anime|show|series|movie|drama)/i);
        return {
          label: "A familiar watch",
          detail: fav ? `You tend to reset with something familiar (like “${fav}”).` : "A familiar show/movie can be a low-effort way to soften the moment when you’re depleted.",
        };
      }
      case "Food": {
        const meal = pickSpecificLike(likes, /(ramen|pizza|sushi|taco|burger|pasta|coffee|tea|boba|ice cream|chocolate|curry)/i);
        return {
          label: "Food as comfort",
          detail: meal ? `Food sometimes acts like a stabilizer — you’ve mentioned liking “${meal}”.` : "Eating something steady can lower the background stress (especially on busy days).",
        };
      }
      case "Resetting your space":
        return { label: "Resetting your space", detail: "Cleaning/organizing shows up as a control-lever: small order outside can reduce chaos inside." };
      case "Faith":
        return { label: "Faith & grounding", detail: "Prayer/church shows up as a way to reconnect to meaning and calm when the week gets loud." };
      case "Therapy":
        return { label: "Therapy & support", detail: "Support shows up as a practice, not a last resort — it’s part of how you stay resourced." };
      case "Animals":
        return { label: "Animals", detail: "Animals can be instant nervous-system comfort: presence without pressure, attention without judgment." };
      case "Outdoors":
        return { label: "Outside time", detail: "Even brief time outdoors can change the tone of the next hour — less ‘stuck in your head’." };
      case "Play":
        return { label: "Play / movement-for-fun", detail: "Dance/swimming/skating show up differently than exercise — more joy, less pressure." };
      case "Photography":
        return { label: "Making / capturing", detail: "Photos shift your attention outward. That can be grounding when your thoughts are looping." };
      case "Exploring":
        return { label: "Exploring", detail: "Exploring the city/forest/travel reads like ‘fresh air for the brain’ — novelty can loosen a stuck mood." };
      default:
        return { label, detail: "This has shown up as something you reach for when you need steadiness." };
    }
  });

  const last = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];
  const trend = last && prev ? last.avg - prev.avg : 0;

  if (trend < -0.9 && items.length < 4) {
    items.push({ label: "One gentle thing", detail: "On heavier days, choosing one small stabilizer can lower the volume (not fix everything)." });
  }

  return items;
}
