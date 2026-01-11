export type SessionModeId = "unwind" | "untangle" | "checkin" | "smallwin";

export type SessionPrompt = {
  id: string;
  title: string;
  helper?: string;
  placeholder?: string;
};

export type SessionMode = {
  id: SessionModeId;
  title: string;
  description: string;
  timeEstimate: string;
  prompts: SessionPrompt[];
};

export const SESSION_MODES: SessionMode[] = [
  {
    id: "unwind",
    title: "Unwind",
    description: "Downshift after a long day. Gentle, calming prompts.",
    timeEstimate: "~5 minutes",
    prompts: [
      {
        id: "unwind_1",
        title: "What’s still buzzing in your body or mind?",
        helper: "No need to explain it perfectly — name it plainly.",
        placeholder: "Examples: tension in my shoulders, replaying a conversation, a to‑do list looping…",
      },
      {
        id: "unwind_2",
        title: "What helped even a little today?",
        helper: "A small thing counts.",
        placeholder: "A walk, a shower, a song, a friend text, finishing one task…",
      },
      {
        id: "unwind_3",
        title: "What do you want to let go of (just for tonight)?",
        helper: "A single sentence is enough.",
        placeholder: "I can’t fix everything tonight — I’m allowed to pause.",
      },
      {
        id: "unwind_4",
        title: "What’s one kind thing you can do for your next hour?",
        helper: "Keep it realistic — 2 minutes is fine.",
        placeholder: "Drink water, tidy one surface, set an alarm, stretch, put my phone away…",
      },
    ],
  },
  {
    id: "untangle",
    title: "Untangle",
    description: "When things feel messy. Clarify the knot, then choose a next step.",
    timeEstimate: "~6 minutes",
    prompts: [
      {
        id: "untangle_1",
        title: "What’s the main knot right now?",
        helper: "Name the topic. You don’t have to solve it here.",
        placeholder: "Work pressure, relationship tension, money worry, decision fatigue…",
      },
      {
        id: "untangle_2",
        title: "What part is in your control — and what isn’t?",
        helper: "Two short lists is perfect.",
        placeholder: "In my control: …\nNot in my control: …",
      },
      {
        id: "untangle_3",
        title: "What story is your brain telling about it?",
        helper: "Write it as-is, even if it sounds dramatic.",
        placeholder: "If I mess this up, everything falls apart…",
      },
      {
        id: "untangle_4",
        title: "What’s one next step that’s small but real?",
        helper: "Aim for ‘next 10 minutes,’ not ‘fix it forever.’",
        placeholder: "Send one message, outline the task, ask for clarity, take a break, write a list…",
      },
    ],
  },
  {
    id: "checkin",
    title: "Check-in",
    description: "Quick scan: how you’re doing + what you need.",
    timeEstimate: "~3 minutes",
    prompts: [
      {
        id: "checkin_1",
        title: "In a few words: how are you, really?",
        helper: "Mood, energy, and stress are all valid.",
        placeholder: "Tired but okay. Restless. Quietly proud. Overstimulated…",
      },
      {
        id: "checkin_2",
        title: "What’s taking up the most space in your head?",
        helper: "One thing is enough.",
        placeholder: "A deadline, a conversation, a decision, an uncertainty…",
      },
      {
        id: "checkin_3",
        title: "What do you need more of right now?",
        helper: "Pick something simple: clarity, rest, support, movement, reassurance…",
        placeholder: "More rest, more structure, more connection, more quiet…",
      },
    ],
  },
  {
    id: "smallwin",
    title: "Small Win",
    description: "Build momentum. Notice progress, then choose what’s next.",
    timeEstimate: "~4 minutes",
    prompts: [
      {
        id: "smallwin_1",
        title: "What’s one small win you want to remember?",
        helper: "Tiny counts — showing up counts.",
        placeholder: "I did the thing I was avoiding. I asked for help. I took a walk…",
      },
      {
        id: "smallwin_2",
        title: "What did you do that made it happen?",
        helper: "Name your part in it.",
        placeholder: "I broke it into steps, set a timer, asked a friend, started anyway…",
      },
      {
        id: "smallwin_3",
        title: "What does this say about you (in a kind way)?",
        helper: "Try a gentle, believable sentence.",
        placeholder: "I’m persistent. I’m learning to care for myself. I can follow through…",
      },
      {
        id: "smallwin_4",
        title: "What’s the next small step you’ll take?",
        helper: "Keep it doable.",
        placeholder: "Do another 10 minutes, prep for tomorrow, send the follow-up, rest…",
      },
    ],
  },
];

export function getSessionMode(id: SessionModeId): SessionMode {
  const found = SESSION_MODES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown session mode: ${id}`);
  return found;
}
