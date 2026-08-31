import type { ReactNode } from "react";

/**
 * A shared empty state. It always offers a next action — an empty result is a place to
 * continue from, not a dead end (docs/RESEARCH.md rule 16).
 */
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed bg-surface-sunken px-6 py-12 text-center">
      <h2 className="text-h3 text-ink">{title}</h2>
      <p className="max-w-prose text-body text-ink-muted">{body}</p>
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
