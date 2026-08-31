"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Debounced search: typing never fires a request per keystroke; navigation happens 250ms
 * after the last change. It is a real GET form to /collection, so it also works with
 * JavaScript unavailable.
 */
export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(initialQuery);
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);

  /*
   * Re-sync with the URL when it changes underneath us — Back, or a filter chip removed.
   * Adjusted during render rather than in an effect: an effect renders once with the stale
   * value and again with the fresh one, which is a visible flicker in a text input.
   */
  if (syncedQuery !== initialQuery) {
    setSyncedQuery(initialQuery);
    setValue(initialQuery);
  }

  useEffect(() => {
    const trimmed = value.trim();
    // Equal means the box matches the URL: either untouched, or just re-synced from it.
    if (trimmed === initialQuery) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("page"); // a new query starts at page one
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const query = next.toString();
      router.push(query ? `/collection?${query}` : "/collection");
    }, 250);

    return () => clearTimeout(timer);
  }, [value, initialQuery, router, searchParams]);

  return (
    <form action="/collection" role="search" className="relative flex w-full items-center">
      <label htmlFor="site-search" className="sr-only">
        Search stones
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by name, reference or origin…"
        autoComplete="off"
        className="h-9 w-full rounded-[var(--radius-md)] border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted hover:border-ink-muted focus:border-accent"
      />
    </form>
  );
}
