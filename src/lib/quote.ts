const LINES = [
    "Write it badly. Keep it honest.",
    "Clarity is allowed to be slow.",
    "Start anywhere—your mind will follow.",
    "No need to solve it. Just name it.",
    "A small truth is still a truth.",
    "You can be messy and still be making progress.",
    "Let the page hold it for a minute.",
    "What you feel counts, even if it’s complicated.",
    "Notice what helped—even a little.",
  ];
  
  export function quoteOfTheDay(d = new Date()) {
    const seed = Number(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
    return LINES[seed % LINES.length];
  }
  