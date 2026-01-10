export type JournalEntry = {
    id: string;
    createdAt: string; // ISO
    text: string;
  };
  
  export type Reflection = {
    entryId: string;
    createdAt: string; // ISO
    mirror: string;
    question: string;
    nudges: string[];
    // Optional for backward-compat with older saved reflections.
    mode?: "local" | "enhanced";
  };
  