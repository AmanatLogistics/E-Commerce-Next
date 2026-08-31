import Link from "next/link";
import type { ReactNode } from "react";
import { GemGrid } from "./gem-card";
import { Pagination } from "@/components/ui/pagination";
import { GemFilters } from "./filters";
import { SortSelect } from "./sort-select";
import { toCategoryOption } from "@/lib/view-models";
import type { CategoryDoc } from "@/lib/db/documents";
import type { BrowseResult } from "@/lib/gems/queries";
import {
  activeFilterCount,
  buildBrowseHref,
  hasActiveFilters,
  type BrowseParams,
} from "@/lib/browse-params";

/** The shared results layout behind /collection and /collection/[slug]. */
export function BrowseView({
  basePath,
  params,
  result,
  categories,
  origins,
  lockedCategory = false,
  heading,
  emptyState,
}: {
  basePath: string;
  params: BrowseParams;
  result: BrowseResult;
  categories: CategoryDoc[];
  origins: string[];
  lockedCategory?: boolean;
  heading: ReactNode;
  emptyState: ReactNode;
}) {
  const chips: { key: string; label: string; href: string }[] = [];

  for (const slug of params.categories) {
    chips.push({
      key: `cat-${slug}`,
      label: categories.find((c) => c.slug === slug)?.name ?? slug,
      href: buildBrowseHref(basePath, params, {
        categories: params.categories.filter((c) => c !== slug),
        page: 1,
      }),
    });
  }
  if (params.origin) {
    chips.push({
      key: "origin",
      label: params.origin,
      href: buildBrowseHref(basePath, params, { origin: "", page: 1 }),
    });
  }
  if (params.untreatedOnly) {
    chips.push({
      key: "untreated",
      label: "Untreated only",
      href: buildBrowseHref(basePath, params, { untreatedOnly: false, page: 1 }),
    });
  }
  if (params.availableOnly) {
    chips.push({
      key: "available",
      label: "Available only",
      href: buildBrowseHref(basePath, params, { availableOnly: false, page: 1 }),
    });
  }

  const clearAllHref = buildBrowseHref(basePath, params, {
    categories: [],
    origin: "",
    untreatedOnly: false,
    availableOnly: false,
    page: 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {heading}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-12">
        <aside className="w-full shrink-0 lg:w-56" aria-label="Filters">
          <GemFilters
            basePath={basePath}
            params={params}
            categories={categories.map(toCategoryOption)}
            origins={origins}
            lockedCategory={lockedCategory}
            activeCount={activeFilterCount(params)}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {result.total === 0
                ? "No stones"
                : `${result.total} ${result.total === 1 ? "stone" : "stones"}`}
              {result.total > 0 && result.totalPages > 1 && (
                <> · page {result.page} of {result.totalPages}</>
              )}
            </p>
            <SortSelect basePath={basePath} params={params} />
          </div>

          {hasActiveFilters(params) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="label-caps">Filtered by</span>
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-2.5 py-1 text-sm text-ink hover:border-danger hover:text-danger"
                >
                  {chip.label}
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">Remove this filter</span>
                </Link>
              ))}
              <Link href={clearAllHref} className="text-sm font-medium text-accent hover:underline">
                Clear all
              </Link>
            </div>
          )}

          {result.items.length === 0 ? (
            <div className="mt-8">{emptyState}</div>
          ) : (
            <>
              <div className="mt-6">
                <GemGrid gems={result.items} priorityCount={4} />
              </div>
              <div className="mt-10">
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  buildHref={(page) => buildBrowseHref(basePath, params, { page })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
