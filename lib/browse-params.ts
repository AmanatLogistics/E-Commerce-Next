/**
 * Sort and filter state lives in the URL so a result page is shareable, bookmarkable and
 * survives a back-navigation. This module is the single parser/serialiser for that state.
 */

export const SORTS = ["newest", "carat-desc", "carat-asc", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  newest: "Newest first",
  "carat-desc": "Carat: large to small",
  "carat-asc": "Carat: small to large",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export const PAGE_SIZE = 12;

export interface BrowseParams {
  q: string;
  page: number;
  sort: Sort;
  /** Gem variety slugs. */
  categories: string[];
  origin: string;
  /** Show only stones with no treatment — a real buying criterion for coloured stones. */
  untreatedOnly: boolean;
  availableOnly: boolean;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseBrowseParams(raw: RawSearchParams): BrowseParams {
  const sortRaw = first(raw.sort);
  const sort = SORTS.includes(sortRaw as Sort) ? (sortRaw as Sort) : "newest";

  const catRaw = raw.cat;
  const categories = (Array.isArray(catRaw) ? catRaw : catRaw ? [catRaw] : [])
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => /^[a-z0-9-]{1,60}$/.test(value));

  return {
    q: (first(raw.q) ?? "").slice(0, 120).trim(),
    page: Math.max(1, positiveInt(first(raw.page)) ?? 1),
    sort,
    categories: [...new Set(categories)],
    origin: (first(raw.origin) ?? "").slice(0, 80).trim(),
    untreatedOnly: first(raw.untreated) === "1",
    availableOnly: first(raw.available) === "1",
  };
}

/** Rebuilds a URL with some params changed. Default values are dropped. */
export function buildBrowseHref(
  basePath: string,
  params: BrowseParams,
  overrides: Partial<BrowseParams> = {},
): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();

  if (merged.q) search.set("q", merged.q);
  if (merged.sort !== "newest") search.set("sort", merged.sort);
  if (merged.categories.length > 0) search.set("cat", merged.categories.join(","));
  if (merged.origin) search.set("origin", merged.origin);
  if (merged.untreatedOnly) search.set("untreated", "1");
  if (merged.availableOnly) search.set("available", "1");
  if (merged.page > 1) search.set("page", String(merged.page));

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function hasActiveFilters(params: BrowseParams): boolean {
  return (
    params.categories.length > 0 ||
    params.origin !== "" ||
    params.untreatedOnly ||
    params.availableOnly
  );
}

export function activeFilterCount(params: BrowseParams): number {
  return (
    params.categories.length +
    (params.origin ? 1 : 0) +
    (params.untreatedOnly ? 1 : 0) +
    (params.availableOnly ? 1 : 0)
  );
}
