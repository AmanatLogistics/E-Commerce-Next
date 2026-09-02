import "server-only";
import { env } from "../env";
import { MemoryCollection } from "./memory/collection";
import { getMemoryStore } from "./memory/store";
import { MongoBackedCollection } from "./mongo";
import type { CategoryDoc, EnquiryDoc, GemDoc, UserDoc } from "./documents";
import type { BaseDoc, GemCollection, IndexSpec } from "./types";

/**
 * Picks the driver once, by whether MONGODB_URI is set. Application code never learns
 * which one it got. See docs/SPEC.md §7 for why the in-memory driver exists.
 */
export const usingMemoryDriver = env.mongodbUri === null;

/*
 * The file-backed driver is a development convenience, not a deployment target: it needs a
 * persistent writable disk, which serverless hosting does not have, and it holds state per
 * instance rather than centrally. Warn once at startup so this is noticed before the first
 * write fails rather than after.
 */
if (usingMemoryDriver && env.isProd && !process.env.NEXT_PHASE) {
  console.warn(
    "\n⚠  MONGODB_URI is not set, so the local file-backed database is being used in a " +
      "production build.\n" +
      "   That will fail on any host without a persistent writable disk (Vercel, Netlify, " +
      "most containers)\n" +
      "   and does not share state between instances. Set MONGODB_URI before deploying.\n",
  );
}

const cache = new Map<string, GemCollection<BaseDoc>>();

function collection<T extends BaseDoc>(name: string): GemCollection<T> {
  const existing = cache.get(name);
  if (existing) return existing as GemCollection<T>;
  // The specs travel with the collection so the driver can create them on first use,
  // rather than relying on a setup script having been run.
  const specs = indexPlan.find((entry) => entry.name === name)?.specs ?? [];
  const created: GemCollection<BaseDoc> = usingMemoryDriver
    ? new MemoryCollection<BaseDoc>(getMemoryStore(env.memoryDbFile), name)
    : new MongoBackedCollection<BaseDoc>(name, specs);
  cache.set(name, created);
  return created as GemCollection<T>;
}

export const users = () => collection<UserDoc>("users");
export const categories = () => collection<CategoryDoc>("categories");
export const gems = () => collection<GemDoc>("gems");
export const enquiries = () => collection<EnquiryDoc>("enquiries");

/** Weights for the gems text index, used by both drivers so ranking intent matches. */
export const GEM_TEXT_WEIGHTS = {
  title: 10,
  reference: 8,
  origin: 4,
  colour: 3,
  description: 1,
} as const;

/** Every index, with the query it exists to serve. Applied by `npm run seed`. */
export const indexPlan: { name: string; specs: IndexSpec[] }[] = [
  {
    name: "users",
    specs: [
      // Login lookup and duplicate-account prevention in one index.
      { key: { email: 1 }, unique: true, name: "email_unique" },
    ],
  },
  {
    name: "categories",
    specs: [
      { key: { slug: 1 }, unique: true, name: "slug_unique" },
      // The nav's exact query: active varieties in display order.
      { key: { active: 1, sortOrder: 1 }, name: "active_sortOrder" },
    ],
  },
  {
    name: "gems",
    specs: [
      { key: { slug: 1 }, unique: true, name: "slug_unique" },
      { key: { reference: 1 }, unique: true, name: "reference_unique" },
      // Collection page: equality fields first, then the sort field, so a variety page
      // sorted by carat weight is answered from the index.
      {
        key: { published: 1, deletedAt: 1, categorySlug: 1, caratWeight: -1 },
        name: "browse_category_carat",
      },
      // Home and "newest" ordering.
      { key: { published: 1, deletedAt: 1, createdAt: -1 }, name: "browse_newest" },
      // A collection may have only one text index, so all searchable fields share it.
      {
        key: {
          title: "text",
          reference: "text",
          origin: "text",
          colour: "text",
          description: "text",
        },
        weights: { ...GEM_TEXT_WEIGHTS },
        name: "gem_text",
      },
    ],
  },
  {
    name: "enquiries",
    specs: [
      { key: { reference: 1 }, unique: true, name: "reference_unique" },
      // The admin inbox: filter by status, newest first.
      { key: { status: 1, createdAt: -1 }, name: "status_createdAt" },
      // Every enquiry about one stone.
      { key: { gemId: 1, createdAt: -1 }, name: "gemId_createdAt" },
    ],
  },
];

/** Tests need the driver instances rebuilt after pointing at a different database file. */
export function resetCollectionCacheForTests(): void {
  cache.clear();
}

export async function ensureIndexes(): Promise<void> {
  for (const { name, specs } of indexPlan) {
    await collection(name).createIndexes(specs);
  }
}
