export function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
  }
  
  export function formatDateShort(d: Date) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  
  export function formatDateLong(d: Date) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  