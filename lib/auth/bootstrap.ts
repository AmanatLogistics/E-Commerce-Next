import "server-only";
import { DEFAULT_ADMIN_PASSWORD, env } from "../env";
import { ensureIndexes, gems, users } from "../db/collections";
import { passwordSchema } from "../validation/schemas";
import { upsertAdmin } from "./admin-account";

/**
 * First-run provisioning, for hosted deployments.
 *
 * On a platform like Vercel there is no shell to run `npm run seed` in, so an admin
 * created only by a script can never exist. This provisions it from the environment on the
 * first sign-in attempt instead, which makes "set the variables in the dashboard, deploy,
 * sign in" the whole setup.
 *
 * The rules are deliberately strict, because this is the one place the application itself
 * can create an account:
 *
 *  1. Only when the database holds NO users at all. It can never promote, overwrite or
 *     reset an existing account — an operator who forgets their password still cannot use
 *     this to get back in.
 *  2. Only when both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD were actually supplied.
 *  3. Never with the documented default password, which is printed in the README.
 *  4. Only with a password that satisfies the same rule the rest of the app enforces.
 *
 * Everything it can do, it does from server-side environment values. Nothing a request
 * carries influences the account that gets made.
 */

export type BootstrapStatus =
  | "created"
  | "already-provisioned"
  | "not-configured"
  | "default-password-refused"
  | "weak-password-refused";

export interface BootstrapResult {
  status: BootstrapStatus;
  /** Safe to show on the sign-in page: it explains setup state, never account state. */
  message: string;
  email?: string;
}

/**
 * Once an admin exists it cannot un-exist during a process's life, so the positive result
 * is cached to keep an extra round trip off every sign-in. The negative is never cached —
 * the whole point is that it becomes positive as soon as the operator arrives.
 */
let provisioned = false;

export async function ensureAdminBootstrapped(): Promise<BootstrapResult> {
  if (provisioned) {
    return { status: "already-provisioned", message: "" };
  }

  if ((await users().countDocuments({})) > 0) {
    provisioned = true;
    // The catalogue is seeded independently of the account: an operator who set
    // SEED_DEMO_CATALOGUE only after their first sign-in would otherwise never get it.
    await seedDemoCatalogueIfRequested();
    return { status: "already-provisioned", message: "" };
  }

  if (!env.adminCredentialsConfigured) {
    return {
      status: "not-configured",
      message:
        "No administrator exists yet. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your " +
        "hosting environment and reload this page — the first sign-in will create the account.",
    };
  }

  if (env.seedAdminPassword === DEFAULT_ADMIN_PASSWORD) {
    return {
      status: "default-password-refused",
      message:
        "SEED_ADMIN_PASSWORD is still the example password from the README, which is public. " +
        "Set a real one in your hosting environment and reload this page.",
    };
  }

  const password = passwordSchema.safeParse(env.seedAdminPassword);
  if (!password.success) {
    return {
      status: "weak-password-refused",
      message: `SEED_ADMIN_PASSWORD is not strong enough: ${password.error.issues[0]?.message}.`,
    };
  }

  /*
   * A fresh hosted database has no indexes either, including the unique one on users.email
   * that makes the race below safe.
   *
   * A failure here must not stop the account being created. A database user without the
   * createIndex privilege can still insert perfectly well, and refusing to provision the
   * administrator over a missing index would lock the operator out of their own site for a
   * reason that only slows queries down. The cost is that the race below is no longer
   * settled by the database, so it is settled by re-reading instead.
   */
  try {
    await ensureIndexes();
  } catch (error) {
    console.warn(
      `Could not create indexes during first-run provisioning: ${(error as Error).message}. ` +
        "Continuing — the administrator is still created, and /api/health reports this.",
    );
  }

  try {
    const result = await upsertAdmin(env.seedAdminEmail, password.data);
    provisioned = true;
    await seedDemoCatalogueIfRequested();
    return {
      status: "created",
      message: "Administrator account created. Sign in with the credentials you configured.",
      email: result.email,
    };
  } catch (error) {
    // Two cold starts can race here. The unique index on email means one loses; that is a
    // success from the caller's point of view, not a failure.
    if ((error as { code?: number }).code === 11000) {
      provisioned = true;
      return { status: "already-provisioned", message: "" };
    }
    throw error;
  }
}

/**
 * Optional demo stock on a first deployment, so the storefront is not an empty shop before
 * any stone has been entered. Only ever runs when the catalogue is completely empty.
 *
 * A failure is logged rather than thrown: this is a convenience, and it must never be the
 * reason an operator cannot sign in to the site they are trying to fill.
 */
let cataloguePlanted = false;

async function seedDemoCatalogueIfRequested(): Promise<void> {
  if (cataloguePlanted) return;
  if (!env.seedDemoCatalogue) return;
  if ((await gems().countDocuments({})) > 0) {
    cataloguePlanted = true;
    return;
  }
  cataloguePlanted = true;
  try {
    await plantDemoCatalogue();
  } catch (error) {
    cataloguePlanted = false;
    console.warn(`Could not seed the demo catalogue: ${(error as Error).message}`);
  }
}

async function plantDemoCatalogue(): Promise<void> {
  const { categories } = await import("../db/collections");
  const { CATEGORIES, GEMS } = await import("../../scripts/catalogue");
  const { toMinor } = await import("../money");
  const { ObjectId } = await import("mongodb");

  const now = new Date();
  const categoryIds = new Map<string, InstanceType<typeof ObjectId>>();

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

  for (const [index, gem] of GEMS.entries()) {
    const categoryId = categoryIds.get(gem.category);
    if (!categoryId) continue;
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
      images: Array.from({ length: 3 + (index % 2) }, (_, i) => ({
        url: `/img/gem/${gem.slug}/${i + 1}`,
        alt: `${gem.title} — view ${i + 1}`,
        width: 600,
        height: 600,
      })),
      published: true,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

/** Tests need to observe a fresh process. */
export function resetBootstrapCacheForTests(): void {
  provisioned = false;
  cataloguePlanted = false;
}
