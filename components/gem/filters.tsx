"use client";

import Link from "next/link";
import { useState } from "react";
import { buildBrowseHref, hasActiveFilters, type BrowseParams } from "@/lib/browse-params";
import type { CategoryOption } from "@/lib/view-models";
import { cn } from "@/lib/cn";

/**
 * Every filter is a plain link, so each combination is a real shareable URL and the whole
 * panel works with JavaScript unavailable. The only client behaviour here is collapsing
 * the panel on small screens, where a permanently open filter list would bury the results.
 */
export function GemFilters({
  basePath,
  params,
  categories,
  origins,
  lockedCategory,
  activeCount,
}: {
  basePath: string;
  params: BrowseParams;
  categories: CategoryOption[];
  origins: string[];
  lockedCategory: boolean;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  const toggleCategory = (slug: string) =>
    params.categories.includes(slug)
      ? params.categories.filter((c) => c !== slug)
      : [...params.categories, slug];

  const rowClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm hover:bg-surface-sunken",
      active ? "font-medium text-accent" : "text-ink-muted",
    );

  const box = (active: boolean) => (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-3.5 shrink-0 rounded-[2px] border",
        active && "border-accent bg-accent",
      )}
    />
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium lg:hidden"
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      <div className={cn("flex flex-col gap-6", !open && "hidden lg:flex")}>
        {!lockedCategory && (
          <fieldset>
            <legend className="label-caps">Variety</legend>
            <ul className="mt-2 flex flex-col gap-0.5">
              {categories.map((category) => {
                const active = params.categories.includes(category.slug);
                return (
                  <li key={category.slug}>
                    <Link
                      href={buildBrowseHref(basePath, params, {
                        categories: toggleCategory(category.slug),
                        page: 1,
                      })}
                      aria-pressed={active}
                      className={rowClass(active)}
                    >
                      {box(active)}
                      {category.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {origins.length > 0 && (
          <fieldset>
            <legend className="label-caps">Origin</legend>
            <ul className="mt-2 flex flex-col gap-0.5">
              {origins.map((origin) => {
                const active = params.origin.toLowerCase() === origin.toLowerCase();
                return (
                  <li key={origin}>
                    <Link
                      href={buildBrowseHref(basePath, params, {
                        origin: active ? "" : origin,
                        page: 1,
                      })}
                      aria-pressed={active}
                      className={rowClass(active)}
                    >
                      {box(active)}
                      {origin}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        <fieldset>
          <legend className="label-caps">Show only</legend>
          <ul className="mt-2 flex flex-col gap-0.5">
            <li>
              <Link
                href={buildBrowseHref(basePath, params, {
                  untreatedOnly: !params.untreatedOnly,
                  page: 1,
                })}
                aria-pressed={params.untreatedOnly}
                className={rowClass(params.untreatedOnly)}
              >
                {box(params.untreatedOnly)}
                Untreated stones
              </Link>
            </li>
            <li>
              <Link
                href={buildBrowseHref(basePath, params, {
                  availableOnly: !params.availableOnly,
                  page: 1,
                })}
                aria-pressed={params.availableOnly}
                className={rowClass(params.availableOnly)}
              >
                {box(params.availableOnly)}
                Available now
              </Link>
            </li>
          </ul>
        </fieldset>

        {hasActiveFilters(params) && (
          <Link
            href={buildBrowseHref(basePath, params, {
              categories: [],
              origin: "",
              untreatedOnly: false,
              availableOnly: false,
              page: 1,
            })}
            className="text-sm font-medium text-accent hover:underline"
          >
            Clear all filters
          </Link>
        )}
      </div>
    </div>
  );
}
