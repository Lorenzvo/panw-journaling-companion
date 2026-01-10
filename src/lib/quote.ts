const LINES = [
    "Start anywhere. Even one sentence counts.",
    "Write it plainly. You can polish later.",
    "Notice what helped—even a little.",
    "You’re allowed to feel two things at once.",
    "Today doesn’t need a perfect summary.",
    "Small honesty adds up.",
    "If it’s messy, it’s still real.",
    "A win can be quiet and still count.",
    "Name the thing. Then breathe.",
  ];
  
  export function quoteOfTheDay(d = new Date()) {
    const seed = Number(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
    return LINES[seed % LINES.length];
  }
  