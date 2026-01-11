import { cn } from "../lib/utils";
import type { ThemeTag } from "./ThemeChips";

function stableAngle(index: number, count: number) {
  if (count <= 0) return 0;
  const step = 360 / count;
  return index * step - 90; // start at top
}

export function ThemeOrbit({
  themes,
  className,
  size = 176,
}: {
  themes: ThemeTag[];
  className?: string;
  size?: number;
}) {
  if (!themes?.length) return null;

  const count = Math.min(themes.length, 8);
  const items = themes.slice(0, count);

  // Keep chips comfortably within the container.
  const radius = Math.max(54, Math.min(size / 2 - 26, 86));

  return (
    <div
      className={cn(
        "relative mx-auto rounded-3xl border border-slate-200 bg-white/70",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="Detected themes"
    >
      <div className="absolute inset-4 rounded-full border border-slate-200/70" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-[11px] font-semibold text-slate-900">Themes</div>
        <div className="mt-0.5 text-[10px] text-slate-500">{themes.length}</div>
      </div>

      {items.map((t, i) => {
        const angle = stableAngle(i, count);
        const transform = `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`;
        return (
          <div
            key={t.id}
            className="absolute left-1/2 top-1/2"
            style={{ transform }}
            title={t.label}
          >
            <div className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
              {t.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
