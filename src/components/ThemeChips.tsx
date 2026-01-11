import { cn } from "../lib/utils";

export type ThemeTag = { id: string; label: string };

const COLOR_BY_ID: Record<string, string> = {
  // Relationship-focused
  romance_dating: "bg-rose-50 text-rose-900 border-rose-200",
  loneliness_solitude: "bg-sky-50 text-sky-900 border-sky-200",
  family_dynamics: "bg-amber-50 text-amber-900 border-amber-200",
  friendship_tension: "bg-violet-50 text-violet-900 border-violet-200",
  financial_relationships: "bg-emerald-50 text-emerald-900 border-emerald-200",

  // Existing
  relationships: "bg-indigo-50 text-indigo-900 border-indigo-200",
  finances: "bg-emerald-50 text-emerald-900 border-emerald-200",
  work: "bg-slate-50 text-slate-900 border-slate-200",
  sleep: "bg-blue-50 text-blue-900 border-blue-200",
  selfcare: "bg-teal-50 text-teal-900 border-teal-200",
  selfworth: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200",
  health: "bg-red-50 text-red-900 border-red-200",
  home: "bg-zinc-50 text-zinc-900 border-zinc-200",
  hobbies: "bg-pink-50 text-pink-900 border-pink-200",
  outdoors: "bg-green-50 text-green-900 border-green-200",
  travel: "bg-cyan-50 text-cyan-900 border-cyan-200",
  pets: "bg-orange-50 text-orange-900 border-orange-200",
  faith: "bg-purple-50 text-purple-900 border-purple-200",
  therapy: "bg-indigo-50 text-indigo-900 border-indigo-200",
  learning: "bg-yellow-50 text-yellow-900 border-yellow-200",
  kids: "bg-lime-50 text-lime-900 border-lime-200",
};

function tagClasses(id: string) {
  return COLOR_BY_ID[id] ?? "bg-white/70 text-slate-700 border-slate-200";
}

export function ThemeChips({
  themes,
  max = 3,
  className,
  size = "sm",
}: {
  themes: ThemeTag[];
  max?: number;
  className?: string;
  size?: "xs" | "sm";
}) {
  if (!themes?.length) return null;

  const visible = themes.slice(0, max);
  const extra = Math.max(0, themes.length - visible.length);

  const base =
    size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((t) => (
        <span
          key={t.id}
          className={cn(
            "inline-flex items-center rounded-full border font-semibold",
            base,
            tagClasses(t.id)
          )}
          title={t.label}
        >
          {t.label}
        </span>
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            "inline-flex items-center rounded-full border font-semibold",
            base,
            "bg-white/70 text-slate-700 border-slate-200"
          )}
          title={themes
            .slice(max)
            .map((t) => t.label)
            .join(", ")}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
