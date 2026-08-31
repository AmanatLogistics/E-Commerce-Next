import "server-only";
import { env } from "../env";
import { MemoryCollection } from "./memory/collection";
import { getMemoryStore } from "./memory/store";
import { MongoBackedCollection } from "./mongo";
import type {
  AddressDoc,
  CartDoc,
  CategoryDoc,
  OrderDoc,
  ProductDoc,
  ReviewDoc,
  UserDoc,
} from "./documents";
import type { BaseDoc, ChowkCollection, IndexSpec } from "./types";

/**
 * Picks the driver once, by whether MONGODB_URI is set. Application code never learns
 * which one it got. See docs/SPEC.md §9 for why the in-memory driver exists.
 */
export const usingMemoryDriver = env.mongodbUri === null;

const cache = new Map<string, ChowkCollection<BaseDoc>>();

function collection<T extends BaseDoc>(name: string): ChowkCollection<T> {
  const existing = cache.get(name);
  if (existing) return existing as ChowkCollection<T>;
  const created: ChowkCollection<BaseDoc> = usingMemoryDriver
    ? (new MemoryCollection<BaseDoc>(getMemoryStore(env.memoryDbFile), name) as ChowkCollection<BaseDoc>)
    : (new MongoBackedCollection<BaseDoc>(name) as ChowkCollection<BaseDoc>);
  cache.set(name, created);
  return created as ChowkCollection<T>;
}

export const users = () => collection<UserDoc>("users");
export const categories = () => collection<CategoryDoc>("categories");
export const products = () => collection<ProductDoc>("products");
export const carts = () => collection<CartDoc>("carts");
export const orders = () => collection<OrderDoc>("orders");
export const addresses = () => collection<AddressDoc>("addresses");
export const reviews = () => collection<ReviewDoc>("reviews");

/** Weights for the products text index. Used by both drivers so ranking intent matches. */
export const PRODUCT_TEXT_WEIGHTS = { title: 10, brand: 5, description: 1 } as const;

/**
 * Every index, with the query it exists to serve. Applied by `npm run seed` and safe to
 * re-run: createIndex is idempotent for an identical spec.
 */
export const indexPlan: { name: string; specs: IndexSpec[] }[] = [
  {
    name: "users",
    specs: [
      // Login lookup and duplicate-signup prevention in one index.
      { key: { email: 1 }, unique: true, name: "email_unique" },
      // Admin customer list, filtered by role and sorted by newest, served from the index.
      { key: { role: 1, createdAt: -1 }, name: "role_createdAt" },
    ],
  },
  {
    name: "categories",
    specs: [
      { key: { slug: 1 }, unique: true, name: "slug_unique" },
      // The nav rail's exact query: active categories in display order.
      { key: { active: 1, sortOrder: 1 }, name: "active_sortOrder" },
    ],
  },
  {
    name: "products",
    specs: [
      { key: { slug: 1 }, unique: true, name: "slug_unique" },
      // Category page: equality fields first, then the range/sort field, so a
      // price-filtered price-sorted category page is answered entirely from the index.
      {
        key: { published: 1, deletedAt: 1, categorySlug: 1, priceMinor: 1 },
        name: "browse_category_price",
      },
      // "Newest" sort and the home grid.
      { key: { published: 1, deletedAt: 1, createdAt: -1 }, name: "browse_newest" },
      // A collection may have only one text index, so all searchable fields share it.
      {
        key: { title: "text", description: "text", brand: "text" },
        weights: { ...PRODUCT_TEXT_WEIGHTS },
        name: "product_text",
      },
      // Admin low-stock panel.
      { key: { stock: 1, published: 1 }, name: "stock_published" },
    ],
  },
  {
    name: "carts",
    specs: [
      { key: { userId: 1 }, unique: true, sparse: true, name: "userId_unique" },
      { key: { guestToken: 1 }, unique: true, sparse: true, name: "guestToken_unique" },
    ],
  },
  {
    name: "orders",
    specs: [
      { key: { orderNumber: 1 }, unique: true, name: "orderNumber_unique" },
      // Account order history: filtered by user, sorted by newest.
      { key: { userId: 1, createdAt: -1 }, name: "userId_createdAt" },
      // Admin list filtered by status, sorted by newest.
      { key: { status: 1, createdAt: -1 }, name: "status_createdAt" },
      { key: { email: 1, createdAt: -1 }, name: "email_createdAt" },
    ],
  },
  {
    name: "addresses",
    specs: [{ key: { userId: 1, isDefault: -1 }, name: "userId_isDefault" }],
  },
  {
    name: "reviews",
    specs: [
      { key: { productId: 1, createdAt: -1 }, name: "productId_createdAt" },
      // One review per customer per product.
      { key: { productId: 1, userId: 1 }, unique: true, sparse: true, name: "product_user_unique" },
    ],
  },
];

export async function ensureIndexes(): Promise<void> {
  for (const { name, specs } of indexPlan) {
    await collection(name).createIndexes(specs);
  }
}
