const QUOTES = [
    "Write the mess. Meaning comes later.",
    "A little honesty goes a long way.",
    "Name it gently. Then keep going.",
    "You don’t have to solve it to write it.",
    "Clarity is allowed to be slow.",
    "Small truths add up.",
    "Start anywhere—your mind will follow.",
    "Let this be imperfect and real.",
  ];
  
  export function quoteOfTheDay(d = new Date()) {
    const seed = Number(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
    );
    return QUOTES[seed % QUOTES.length];
  }
  