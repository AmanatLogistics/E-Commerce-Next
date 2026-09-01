import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Level 0 elevation: a hairline border and no shadow. Shadow is reserved for layers that
 * genuinely float (dropdowns, modals) so it keeps meaning something.
 */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border bg-surface", className)}>{children}</div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-b px-4 py-3", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
