import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "success" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  info: "bg-brand-wash text-brand",
  success: "bg-success-wash text-success",
  danger: "bg-danger-wash text-danger",
  accent: "bg-gold-wash text-gold",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium uppercase tracking-[var(--tracking-nav)]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
