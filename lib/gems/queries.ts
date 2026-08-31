import "server-only";
import { ObjectId } from "mongodb";
import { GEM_TEXT_WEIGHTS, categories, gems } from "../db/collections";
import type { CategoryDoc, GemDoc, GemStatus } from "../db/documents";
import type { Filter } from "../db/types";
import { PAGE_SIZE, type BrowseParams, type Sort } from "../browse-params";

/** The shape a gem takes on a card. No internal fields cross to the client. */
export interface GemCardView {
  id: string;
  slug: string;
  reference: string;
  title: string;
  categorySlug: string;
  image: string;
  imageAlt: string;
  caratWeight: number;
  shape: string;
  origin: string;
  treatment: string;
  priceMinor: number | null;
  status: GemStatus;
}

export function toCardView(gem: GemDoc): GemCardView {
  return {
    id: gem._id.toHexString(),
    slug: gem.slug,
    reference: gem.reference,
    title: gem.title,
    categorySlug: gem.categorySlug,
    image: gem.images[0]?.url ?? "",
    imageAlt: gem.images[0]?.alt ?? gem.title,
    caratWeight: gem.caratWeight,
    shape: gem.shape,
    origin: gem.origin,
    treatment: gem.treatment,
    priceMinor: gem.priceMinor,
    status: gem.status,
  };
}

/** Only published, non-deleted stones are ever visible publicly. */
const VISIBLE = { published: true, deletedAt: null } as const;

const SORT_SPECS: Record<Sort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  "carat-desc": { caratWeight: -1 },
  "carat-asc": { caratWeight: 1 },
  "price-asc": { priceMinor: 1 },
  "price-desc": { priceMinor: -1 },
};

function browseFilter(params: BrowseParams, categorySlug?: string): Filter<GemDoc> {
  const filter: Filter<GemDoc> = { ...VISIBLE };

  const slugs = categorySlug ? [categorySlug] : params.categories;
  if (slugs.length === 1) filter.categorySlug = slugs[0];
  else if (slugs.length > 1) filter.categorySlug = { $in: slugs };

  if (params.origin) {
    // Anchored, case-insensitive prefix match: "Swat" matches "Swat Valley, Pakistan".
    filter.origin = { $regex: `^${escapeRegex(params.origin)}`, $options: "i" };
  }
  if (params.untreatedOnly) filter.treatment = { $regex: "^none", $options: "i" };
  if (params.availableOnly) filter.status = "available";

  return filter;
}

/** Stock references look like KG-EM-0101: letters, hyphens and digits, no spaces. */
const REFERENCE_PATTERN = /^[a-z]{1,4}-[a-z]{1,4}-\d{2,8}$/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface BrowseResult {
  items: GemCardView[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * The one query behind both the collection pages and search. Pagination, sorting and
 * filtering happen in the database, never by loading everything and slicing in JS.
 */
export async function browseGems(
  params: BrowseParams,
  categorySlug?: string,
): Promise<BrowseResult> {
  const filter = browseFilter(params, categorySlug);
  const skip = (params.page - 1) * PAGE_SIZE;

  if (params.q) {
    /*
     * A stock reference is looked up exactly, not tokenised. "KG-EM-0101" splits into
     * "kg", "em" and "0101", and "kg" alone matches every reference in the catalogue —
     * so a dealer typing a stock number would get the whole shop back. Anyone entering
     * something of this shape wants that one stone.
     */
    if (REFERENCE_PATTERN.test(params.q)) {
      const exact = await gems().find({
        ...filter,
        reference: { $regex: `^${escapeRegex(params.q)}$`, $options: "i" },
      });
      /*
       * Returned whether or not it matched. Falling through to the tokenised search on a
       * miss would answer "KG-ZZ-9999" with the entire catalogue, for the same reason as
       * above; an unknown stock number should show the empty state.
       */
      return {
        items: exact.map(toCardView),
        total: exact.length,
        page: 1,
        totalPages: 1,
      };
    }

    // Text search cannot also count, so ranking happens first and the page is taken after.
    const matches = await gems().textSearch(params.q, filter, {
      weights: { ...GEM_TEXT_WEIGHTS },
    });
    const sorted = params.sort === "newest" ? matches : sortInMemory(matches, params.sort);
    return {
      items: sorted.slice(skip, skip + PAGE_SIZE).map(toCardView),
      total: sorted.length,
      page: params.page,
      totalPages: Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)),
    };
  }

  const [items, total] = await Promise.all([
    gems().find(filter, { sort: SORT_SPECS[params.sort], skip, limit: PAGE_SIZE }),
    gems().countDocuments(filter),
  ]);

  return {
    items: items.map(toCardView),
    total,
    page: params.page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Re-sorting text results: the ranking is gone, so an explicit order is applied over it. */
function sortInMemory(docs: GemDoc[], sort: Sort): GemDoc[] {
  const [field, direction] = Object.entries(SORT_SPECS[sort])[0] as [keyof GemDoc, 1 | -1];
  return [...docs].sort((a, b) => {
    // "Price on request" has no number; those stones sort last either way.
    const x = a[field] === null ? Number.POSITIVE_INFINITY : Number(a[field]);
    const y = b[field] === null ? Number.POSITIVE_INFINITY : Number(b[field]);
    const cmp = x - y;
    return direction === 1 ? cmp : -cmp;
  });
}

export async function getGemBySlug(slug: string): Promise<GemDoc | null> {
  return gems().findOne({ slug, ...VISIBLE });
}

export async function getAllGemSlugs(): Promise<string[]> {
  const all = await gems().find(VISIBLE, { projection: { slug: 1 } });
  return all.map((gem: GemDoc) => gem.slug);
}

export async function getActiveCategories(): Promise<CategoryDoc[]> {
  return categories().find({ active: true }, { sort: { sortOrder: 1 } });
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDoc | null> {
  return categories().findOne({ slug, active: true });
}

/** Hand-picked stones for the home page, newest first. */
export async function getFeaturedGems(limit: number): Promise<GemCardView[]> {
  const featured = await gems().find(
    { ...VISIBLE, featured: true },
    { sort: { createdAt: -1 }, limit },
  );
  return featured.map(toCardView);
}

export async function getLatestGems(limit: number): Promise<GemCardView[]> {
  const latest = await gems().find(VISIBLE, { sort: { createdAt: -1 }, limit });
  return latest.map(toCardView);
}

/** Other stones of the same variety, excluding this one. */
export async function getRelatedGems(gem: GemDoc, limit: number): Promise<GemCardView[]> {
  const related = await gems().find(
    { ...VISIBLE, categorySlug: gem.categorySlug, _id: { $ne: gem._id } },
    { sort: { createdAt: -1 }, limit },
  );
  return related.map(toCardView);
}

export async function getGemById(id: string): Promise<GemDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return gems().findOne({ _id: new ObjectId(id) });
}

/** Distinct origins across the visible catalogue, for the origin filter. */
export async function getOrigins(): Promise<string[]> {
  const all = await gems().find(VISIBLE, { projection: { origin: 1 } });
  const seen = new Map<string, string>();
  for (const gem of all) {
    // Group by the place, not the full "Swat Valley, Pakistan" string.
    const head = gem.origin.split(",")[0].trim();
    if (head) seen.set(head.toLowerCase(), head);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Counts per variety, for the collection index. */
export async function getCategoryCounts(): Promise<Map<string, number>> {
  const all = await gems().find(VISIBLE, { projection: { categorySlug: 1 } });
  const counts = new Map<string, number>();
  for (const gem of all) {
    counts.set(gem.categorySlug, (counts.get(gem.categorySlug) ?? 0) + 1);
  }
  return counts;
}
