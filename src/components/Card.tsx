import { cn } from "../lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}
