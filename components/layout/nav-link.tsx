"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

/**
 * A navigation link that admits it has been clicked.
 *
 * The variety pages are rendered on demand, so between the click and the new page there is
 * a round trip. Without a sign that anything is happening, that gap reads as the click
 * having missed — so people click again, and the second click makes it slower. The whole
 * "it reloaded and nothing happened" feeling lives in that silence.
 *
 * useLinkStatus (next/link) reports the pending state of the Link it sits inside, which is
 * why the indicator is a child rather than a wrapper. The bar is a scaleX transform on the
 * compositor, so it costs nothing while the browser is busy fetching.
 */

function PendingBar() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-2 bottom-1 h-px origin-left bg-brand transition-transform duration-300 ease-[var(--ease-out-soft)]",
        pending ? "scale-x-100" : "scale-x-0",
      )}
    />
  );
}

export function NavLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("relative", className)}
    >
      {children}
      <PendingBar />
    </Link>
  );
}
