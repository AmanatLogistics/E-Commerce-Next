import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * The wordmark: a small emerald-cut crest over the name. Drawn rather than an image file
 * so it stays crisp at any size and follows the theme's ink colour.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 24"
      aria-hidden="true"
      className={cn("h-5 w-auto", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    >
      {/* An emerald cut seen face on: cropped corners, a table, and two step facets. */}
      <path d="M9 2h14l5 5v10l-5 5H9l-5-5V7z" />
      <path d="M12 6h8l3 3v6l-3 3h-8l-3-3V9z" opacity="0.75" />
      <path d="M14.5 9.5h3l1.5 1.5v2l-1.5 1.5h-3L13 13v-2z" opacity="0.5" />
    </svg>
  );
}

export async function Wordmark({
  className,
  align = "center",
}: {
  className?: string;
  align?: "center" | "left";
}) {
  const site = await getSiteSettings();
  return (
    <span
      className={cn(
        "flex flex-col gap-1",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <Crest className="h-4 text-gold sm:h-5" />
      {/*
        * The name is twenty-two tracked-out characters. At 390px it wraps and drags the crest
        * off centre, so both the size and the tracking step down on small screens rather
        * than the name being truncated — a wordmark that wraps stops reading as a wordmark.
        */}
      <span className="whitespace-nowrap font-display text-[0.8rem] leading-none tracking-[0.08em] text-ink sm:text-[1.35rem] sm:tracking-[0.14em]">
        {site.name.toUpperCase()}
      </span>
    </span>
  );
}
