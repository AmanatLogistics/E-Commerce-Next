import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * "Price on request" is a first-class state here, not a missing value. It is normal for
 * higher-value stones, so it is rendered as a deliberate label rather than a blank.
 */
export function GemPrice({
  priceMinor,
  size = "md",
  className,
}: {
  priceMinor: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-body",
    md: "text-h3",
    lg: "text-h2 font-display",
  } as const;

  if (priceMinor === null) {
    return (
      <span className={cn("italic text-ink-muted", sizes[size], className)}>
        Price on request
      </span>
    );
  }

  return (
    <span className={cn("font-medium text-ink", sizes[size], className)}>
      {formatMoney(priceMinor)}
    </span>
  );
}
