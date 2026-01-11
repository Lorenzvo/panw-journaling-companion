import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export type CardProps = {
  className?: string;
  children: ReactNode;
};

export function Card({
  className,
  children,
}: CardProps) {
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
