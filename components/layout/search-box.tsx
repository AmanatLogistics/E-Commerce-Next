"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Debounced search: typing never fires a request per keystroke; navigation happens 250ms
 * after the last change. It is a real GET form to /collection, so it also works with
 * JavaScript unavailable.
 */
export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    setValue(initialQuery);
    dirty.current = false;
  }, [initialQuery]);

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed === initialQuery) return;
      const next = new URLSearchParams(searchParams.toString());
      next.delete("page");
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const query = next.toString();
      router.push(query ? `/collection?${query}` : "/collection");
    }, 250);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
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
        onChange={(event) => {
          dirty.current = true;
          setValue(event.target.value);
        }}
        placeholder="Search by name, reference or origin…"
        autoComplete="off"
        className="h-9 w-full rounded-[var(--radius-md)] border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted hover:border-ink-muted focus:border-accent"
      />
    </form>
  );
}
