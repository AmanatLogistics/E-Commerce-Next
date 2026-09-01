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
        className="h-10 rounded-[var(--radius-md)] border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:border-ink focus:border-brand"
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
