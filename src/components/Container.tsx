import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export type ContainerProps = {
  className?: string;
  children: ReactNode;
};

export function Container({
  className,
  children,
}: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}
