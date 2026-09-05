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
  const { upsertAdmin } = await import("../lib/auth/admin-account");
  const { env } = await import("../lib/env");
  const { toMinor } = await import("../lib/money");
  const { looksTruncated, quotingAdvice, readRawEnvValue } = await import("../lib/env-file");
  const { passwordSchema } = await import("../lib/validation/schemas");

  /*
   * Checked before anything is written. dotenv cuts an unquoted value at the first `#`, so
   * a password like `MySecret#Pass123` silently becomes `MySecret` and the account is
   * created with something nobody typed — the only symptom being a login that will not
   * work. Refuse rather than seed an account that cannot be signed in to.
   */
  for (const file of [".env.local", ".env"]) {
    if (looksTruncated(file, "SEED_ADMIN_PASSWORD", process.env.SEED_ADMIN_PASSWORD)) {
      const raw = readRawEnvValue(file, "SEED_ADMIN_PASSWORD")!;
      console.error(`\n✗ SEED_ADMIN_PASSWORD in ${file} is being cut short.\n`);
      console.error(`  In the file  : ${raw.raw}`);
      console.error(`  Actually read: ${process.env.SEED_ADMIN_PASSWORD}\n`);
      console.error("  An unquoted # starts a comment in a .env file. Quote it:\n");
      console.error(`${quotingAdvice("SEED_ADMIN_PASSWORD", raw.raw)}\n`);
      process.exit(1);
    }
  }

  const seedPassword = passwordSchema.safeParse(env.seedAdminPassword);
  if (!seedPassword.success) {
    console.error("\n✗ SEED_ADMIN_PASSWORD will not do:\n");
    for (const issue of seedPassword.error.issues) console.error(`  · ${issue.message}`);
    console.error("\n  Fix it in .env.local (quoted), then run the seed again.\n");
    process.exit(1);
  }

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
      priceMinor: gem.price === null ? null : toMinor(gem.price),
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

  const admin = await upsertAdmin(env.seedAdminEmail, seedPassword.data);

  console.log("\n✓ Seed complete.");
  console.log(`  Admin sign-in: ${admin.email} / ${env.seedAdminPassword}`);
  console.log("  Change SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local before deploying,");
  console.log("  or set them later with `npm run admin` — which keeps your enquiries.\n");

  if (!usingMemoryDriver) {
    const { closeMongo } = await import("../lib/db/mongo");
    await closeMongo();
  }
}

main().catch((error) => {
  console.error("\n✗ Seed failed:", error);
  process.exit(1);
});
