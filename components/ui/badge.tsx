import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "success" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  info: "bg-primary-wash text-primary",
  success: "bg-success-wash text-success",
  danger: "bg-danger-wash text-danger",
  // Brass: discounts and price urgency only.
  accent: "bg-accent text-accent-ink",
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
        "inline-flex items-center rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
