import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Server-side pagination. The page number lives in the URL, so a result page is
 * shareable and survives a back-navigation (docs/RESEARCH.md rule 18).
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const visible = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] border px-3 text-sm transition-colors hover:bg-surface-sunken";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className={linkClass} rel="prev">
          Previous
        </Link>
      )}

      {visible.map((p, index) => {
        const previous = visible[index - 1];
        const gap = previous !== undefined && p - previous > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap && (
              <span className="px-1 text-ink-muted" aria-hidden="true">
                …
              </span>
            )}
            <Link
              href={buildHref(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                linkClass,
                p === page && "border-accent bg-accent text-accent-ink hover:bg-accent-hover",
              )}
            >
              {p}
            </Link>
          </span>
        );
      })}

      {page < totalPages && (
        <Link href={buildHref(page + 1)} className={linkClass} rel="next">
          Next
        </Link>
      )}
    </nav>
  );
}
