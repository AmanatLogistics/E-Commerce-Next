"use client";

import { useRouter } from "next/navigation";
import { SORTS, SORT_LABELS, buildBrowseHref, type BrowseParams, type Sort } from "@/lib/browse-params";

/** Sorting pushes a new URL, so a sorted view is shareable and the back button behaves. */
export function SortSelect({ basePath, params }: { basePath: string; params: BrowseParams }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="label-caps shrink-0">
        Sort
      </label>
      <select
        id="sort"
        value={params.sort}
        onChange={(event) =>
          router.push(buildBrowseHref(basePath, params, { sort: event.target.value as Sort, page: 1 }))
        }
        className="h-9 rounded-[var(--radius-md)] border bg-surface px-2 text-sm text-ink hover:border-ink-muted focus:border-accent"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}
