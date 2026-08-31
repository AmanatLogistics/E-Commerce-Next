import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { carts, products } from "../db/collections";
import type { CartDoc, ProductDoc } from "../db/documents";
import { discountPercent } from "../money";

export const CART_COOKIE = "chowk_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** A cart line joined with live product data. Prices always come from the product. */
export interface CartLine {
  productId: string;
  slug: string;
  title: string;
  image: string;
  imageAlt: string;
  unitPriceMinor: number;
  compareAtMinor: number | null;
  discountPercent: number | null;
  qty: number;
  /** Clamped to what is actually in stock, so the UI cannot show an unbuyable quantity. */
  maxQty: number;
  lineTotalMinor: number;
  inStock: boolean;
}

export interface CartView {
  lines: CartLine[];
  itemCount: number;
  subtotalMinor: number;
}

async function readCartCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Issues a guest token on first write. Read paths never mint one. */
async function ensureCartCookie(): Promise<string> {
  const existing = await readCartCookie();
  if (existing) return existing;
  const token = randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_MAX_AGE,
  });
  return token;
}

async function findCart(userId: ObjectId | null): Promise<CartDoc | null> {
  if (userId) return carts().findOne({ userId });
  const token = await readCartCookie();
  if (!token) return null;
  return carts().findOne({ guestToken: token });
}

async function upsertCart(userId: ObjectId | null): Promise<CartDoc> {
  if (userId) {
    await carts().updateOne(
      { userId },
      { $setOnInsert: { userId, guestToken: null, items: [] }, $set: { updatedAt: new Date() } },
      { upsert: true },
    );
    return (await carts().findOne({ userId }))!;
  }
  const token = await ensureCartCookie();
  await carts().updateOne(
    { guestToken: token },
    { $setOnInsert: { guestToken: token, userId: null, items: [] }, $set: { updatedAt: new Date() } },
    { upsert: true },
  );
  return (await carts().findOne({ guestToken: token }))!;
}

/**
 * Joins the cart's {productId, qty} lines with live products. Lines whose product has been
 * deleted or unpublished are dropped rather than rendered as a broken row.
 */
export async function getCartView(userId: ObjectId | null): Promise<CartView> {
  const cart = await findCart(userId);
  if (!cart || cart.items.length === 0) {
    return { lines: [], itemCount: 0, subtotalMinor: 0 };
  }

  const found = await products().find({
    _id: { $in: cart.items.map((i) => i.productId) },
    published: true,
    deletedAt: null,
  });
  const byId = new Map(found.map((p) => [p._id.toHexString(), p]));

  const lines: CartLine[] = [];
  for (const item of cart.items) {
    const product = byId.get(item.productId.toHexString());
    if (!product) continue;
    const qty = Math.min(item.qty, Math.max(product.stock, 0));
    const unit = product.priceMinor;
    lines.push({
      productId: product._id.toHexString(),
      slug: product.slug,
      title: product.title,
      image: product.images[0]?.url ?? "",
      imageAlt: product.images[0]?.alt ?? product.title,
      unitPriceMinor: unit,
      compareAtMinor: product.compareAtMinor,
      discountPercent: discountPercent(unit, product.compareAtMinor),
      qty,
      maxQty: Math.min(20, product.stock),
      lineTotalMinor: unit * qty,
      inStock: product.stock > 0,
    });
  }

  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotalMinor: lines.reduce((sum, l) => sum + l.lineTotalMinor, 0),
  };
}

function clampQty(qty: number, product: ProductDoc): number {
  return Math.max(0, Math.min(qty, product.stock, 20));
}

export async function addToCart(
  userId: ObjectId | null,
  productId: ObjectId,
  qty: number,
): Promise<void> {
  const product = await products().findOne({ _id: productId, published: true, deletedAt: null });
  if (!product) throw new Error("That product is no longer available.");
  if (product.stock <= 0) throw new Error("That product is out of stock.");

  const cart = await upsertCart(userId);
  const existing = cart.items.find((i) => i.productId.toHexString() === productId.toHexString());
  const nextQty = clampQty((existing?.qty ?? 0) + qty, product);

  const items = existing
    ? cart.items.map((i) =>
        i.productId.toHexString() === productId.toHexString() ? { ...i, qty: nextQty } : i,
      )
    : [...cart.items, { productId, qty: nextQty }];

  await carts().updateOne({ _id: cart._id }, { $set: { items, updatedAt: new Date() } });
}

export async function setCartQty(
  userId: ObjectId | null,
  productId: ObjectId,
  qty: number,
): Promise<void> {
  const cart = await findCart(userId);
  if (!cart) return;

  if (qty <= 0) {
    await removeFromCart(userId, productId);
    return;
  }

  const product = await products().findOne({ _id: productId, published: true, deletedAt: null });
  if (!product) return;

  const items = cart.items.map((i) =>
    i.productId.toHexString() === productId.toHexString() ? { ...i, qty: clampQty(qty, product) } : i,
  );
  await carts().updateOne({ _id: cart._id }, { $set: { items, updatedAt: new Date() } });
}

export async function removeFromCart(userId: ObjectId | null, productId: ObjectId): Promise<void> {
  const cart = await findCart(userId);
  if (!cart) return;
  const items = cart.items.filter((i) => i.productId.toHexString() !== productId.toHexString());
  await carts().updateOne({ _id: cart._id }, { $set: { items, updatedAt: new Date() } });
}

export async function clearCart(userId: ObjectId | null): Promise<void> {
  const cart = await findCart(userId);
  if (!cart) return;
  await carts().updateOne({ _id: cart._id }, { $set: { items: [], updatedAt: new Date() } });
}

/**
 * Merges a guest cart into the user's cart at login and at signup.
 *
 * Union with clamping, never replacement: replacing loses whichever cart the shopper built
 * first, which is the failure people notice. Quantities add, then clamp to stock and to the
 * per-line maximum.
 */
export async function mergeGuestCart(userId: ObjectId): Promise<void> {
  const token = await readCartCookie();
  if (!token) return;

  const guestCart = await carts().findOne({ guestToken: token });
  const store = await cookies();

  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await carts().deleteOne({ _id: guestCart._id });
    store.delete(CART_COOKIE);
    return;
  }

  const userCart = await upsertCart(userId);
  const merged = new Map<string, number>();
  for (const item of userCart.items) merged.set(item.productId.toHexString(), item.qty);
  for (const item of guestCart.items) {
    const key = item.productId.toHexString();
    merged.set(key, (merged.get(key) ?? 0) + item.qty);
  }

  const ids = [...merged.keys()].map((id) => new ObjectId(id));
  const live = await products().find({ _id: { $in: ids }, published: true, deletedAt: null });
  const byId = new Map(live.map((p) => [p._id.toHexString(), p]));

  const items = [...merged.entries()]
    .map(([id, qty]) => {
      const product = byId.get(id);
      if (!product) return null;
      const clamped = clampQty(qty, product);
      return clamped > 0 ? { productId: new ObjectId(id), qty: clamped } : null;
    })
    .filter((i): i is { productId: ObjectId; qty: number } => i !== null);

  await carts().updateOne({ _id: userCart._id }, { $set: { items, updatedAt: new Date() } });
  await carts().deleteOne({ _id: guestCart._id });
  store.delete(CART_COOKIE);
}
