import { cn } from "../lib/utils";

export function Toggle({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition",
        checked
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-slate-200 bg-white/70 hover:bg-slate-50"
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition",
          checked ? "bg-emerald-500" : "bg-slate-300"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {sublabel && (
          <div className="text-xs text-slate-600 leading-snug">{sublabel}</div>
        )}
      </div>
    </button>
  );
}
