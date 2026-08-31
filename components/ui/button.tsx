import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Gold is the only non-neutral in the interface, and it marks the primary action.
  primary: "bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-ink-muted",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-sunken",
  ghost: "bg-transparent text-ink hover:bg-surface-sunken",
  danger: "bg-danger text-white hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-body gap-2",
  lg: "h-12 px-6 text-body gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render as the child element (a Link, say) while keeping button styling. */
  asChild?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
