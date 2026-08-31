/**
 * Resets and seeds the database.
 *
 * Idempotent by construction: it clears the collections it owns, then writes the demo
 * catalogue and exactly one admin user. The admin is created here and only here — the
 * application has no code path that can create or promote an admin.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

import { ObjectId } from "mongodb";
import { CATEGORIES, PRODUCTS } from "./catalogue";

async function main() {
  // Imported after dotenv so lib/env.ts observes the loaded variables.
  const { categories, products, users, carts, orders, addresses, reviews, ensureIndexes, usingMemoryDriver } =
    await import("../lib/db/collections");
  const { hashPassword } = await import("../lib/auth/password");
  const { env } = await import("../lib/env");
  const { rupees } = await import("../lib/money");

  console.log(
    usingMemoryDriver
      ? `→ Seeding the in-memory driver at ${env.memoryDbFile} (MONGODB_URI not set).`
      : `→ Seeding MongoDB database "${env.mongodbDb}".`,
  );

  await ensureIndexes();

  for (const [name, col] of [
    ["products", products()],
    ["categories", categories()],
    ["users", users()],
    ["carts", carts()],
    ["orders", orders()],
    ["addresses", addresses()],
    ["reviews", reviews()],
  ] as const) {
    const removed = await col.deleteMany({});
    if (removed.deletedCount) console.log(`  cleared ${removed.deletedCount} from ${name}`);
  }

  const now = new Date();

  const categoryIds = new Map<string, ObjectId>();
  for (const category of CATEGORIES) {
    const _id = new ObjectId();
    categoryIds.set(category.slug, _id);
    await categories().insertOne({
      _id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      image: `/img/product/${category.slug}/1`,
      sortOrder: category.sortOrder,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`  ${CATEGORIES.length} categories`);

  let imageCount = 0;
  for (const [index, product] of PRODUCTS.entries()) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Unknown category "${product.category}" on ${product.slug}`);

    // 3 or 4 images each, deterministic per slug (see app/img/product/[slug]/[index]).
    const images = Array.from({ length: 3 + (index % 2) }, (_, i) => ({
      url: `/img/product/${product.slug}/${i + 1}`,
      alt: `${product.title} — view ${i + 1}`,
      width: 600,
      height: 600,
    }));
    imageCount += images.length;

    // Spread createdAt so "newest" sorting has something meaningful to order by.
    const createdAt = new Date(now.getTime() - index * 36e5);

    await products().insertOne({
      slug: product.slug,
      title: product.title,
      description: product.description,
      brand: product.brand,
      categoryId,
      categorySlug: product.category,
      priceMinor: rupees(product.price),
      compareAtMinor: product.compareAt ? rupees(product.compareAt) : null,
      currency: "PKR",
      stock: product.stock,
      images,
      specs: product.specs.map(([label, value]) => ({ label, value })),
      rating: { average: product.rating[0], count: product.rating[1] },
      published: true,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
  }
  console.log(`  ${PRODUCTS.length} products (${imageCount} images)`);

  await users().insertOne({
    email: env.seedAdminEmail.toLowerCase(),
    name: "Store Admin",
    passwordHash: await hashPassword(env.seedAdminPassword),
    role: "admin",
    tokenVersion: 0,
    disabled: false,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  });

  console.log("\n✓ Seed complete.");
  console.log(`  Admin sign-in: ${env.seedAdminEmail} / ${env.seedAdminPassword}`);
  console.log("  Change SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local before deploying.\n");

  if (!usingMemoryDriver) {
    const { closeMongo } = await import("../lib/db/mongo");
    await closeMongo();
  }
}

main().catch((error) => {
  console.error("\n✗ Seed failed:", error);
  process.exit(1);
});
