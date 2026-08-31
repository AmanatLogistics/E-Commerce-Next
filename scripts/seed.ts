/**
 * Resets and seeds the database.
 *
 * Idempotent by construction: it clears the collections it owns, then writes the demo
 * catalogue and exactly one admin user. The admin is created here and only here — the
 * application has no code path that can create or promote an account.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

import { ObjectId } from "mongodb";
import { CATEGORIES, GEMS } from "./catalogue";

async function main() {
  // Imported after dotenv so lib/env.ts observes the loaded variables.
  const { categories, gems, users, enquiries, ensureIndexes, usingMemoryDriver } = await import(
    "../lib/db/collections"
  );
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
    ["gems", gems()],
    ["categories", categories()],
    ["users", users()],
    ["enquiries", enquiries()],
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
      sortOrder: category.sortOrder,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`  ${CATEGORIES.length} gem varieties`);

  let imageCount = 0;
  for (const [index, gem] of GEMS.entries()) {
    const categoryId = categoryIds.get(gem.category);
    if (!categoryId) throw new Error(`Unknown variety "${gem.category}" on ${gem.slug}`);

    // 3 or 4 views each, generated deterministically (see app/img/gem/[slug]/[index]).
    const images = Array.from({ length: 3 + (index % 2) }, (_, i) => ({
      url: `/img/gem/${gem.slug}/${i + 1}`,
      alt: `${gem.title} — view ${i + 1}`,
      width: 600,
      height: 600,
    }));
    imageCount += images.length;

    // Spread createdAt so "newest" ordering has something meaningful to sort by.
    const createdAt = new Date(now.getTime() - index * 36e5);

    await gems().insertOne({
      slug: gem.slug,
      reference: gem.reference,
      title: gem.title,
      description: gem.description,
      categoryId,
      categorySlug: gem.category,
      caratWeight: gem.carat,
      shape: gem.shape,
      cut: gem.cut,
      colour: gem.colour,
      clarity: gem.clarity,
      dimensionsMm: { length: gem.dims[0], width: gem.dims[1], depth: gem.dims[2] },
      origin: gem.origin,
      treatment: gem.treatment,
      certificate: gem.certificate,
      priceMinor: gem.price === null ? null : rupees(gem.price),
      status: gem.status,
      featured: gem.featured,
      images,
      published: true,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
  }
  console.log(`  ${GEMS.length} stones (${imageCount} images)`);

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
