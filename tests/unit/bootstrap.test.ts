import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";

/**
 * First-run provisioning is the ONE place the running application can create an account,
 * so its limits are what make that safe. These pin them down.
 *
 * The module reads configuration at import time through lib/env, so each case sets the
 * environment and then imports a fresh copy of the module graph.
 */

const dir = mkdtempSync(join(tmpdir(), "rec-boot-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;

/**
 * A fresh process-like world: its own database file, its own driver instances, and the
 * bootstrap memo cleared. The modules themselves are shared — Node will not re-evaluate
 * them — so the state they hold is reset explicitly instead.
 */
async function withEnv(vars: Record<string, string | undefined>) {
  n += 1;
  process.env.REC_MEMORY_DB = join(dir, `db-${n}.json`);
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const bootstrap = await import("../../lib/auth/bootstrap");
  const collections = await import("../../lib/db/collections");
  const { resetMemoryStoreForTests } = await import("../../lib/db/memory/store");

  bootstrap.resetBootstrapCacheForTests();
  resetMemoryStoreForTests();
  collections.resetCollectionCacheForTests();

  return { bootstrap, collections };
}

beforeEach(() => {
  delete process.env.SEED_ADMIN_EMAIL;
  delete process.env.SEED_ADMIN_PASSWORD;
  delete process.env.SEED_DEMO_CATALOGUE;
});

describe("first-run bootstrap", () => {
  it("creates the admin from the environment when the database is empty", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "RealPassword123",
    });

    const result = await bootstrap.ensureAdminBootstrapped();
    assert.equal(result.status, "created");
    assert.equal(result.email, "owner@example.com");

    const admin = await collections.users().findOne({ email: "owner@example.com" });
    assert.ok(admin);
    assert.equal(admin.role, "admin");
  });

  it("refuses when the credentials were never configured", async () => {
    const { bootstrap, collections } = await withEnv({});
    const result = await bootstrap.ensureAdminBootstrapped();

    assert.equal(result.status, "not-configured");
    assert.match(result.message, /SEED_ADMIN_EMAIL/);
    assert.equal(await collections.users().countDocuments({}), 0, "must create nothing");
  });

  it("refuses the documented default password, which is public", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "AdminPass123!",
    });

    const result = await bootstrap.ensureAdminBootstrapped();
    assert.equal(result.status, "default-password-refused");
    assert.equal(await collections.users().countDocuments({}), 0);
  });

  it("refuses a password too weak for the app's own rule", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "short",
    });

    const result = await bootstrap.ensureAdminBootstrapped();
    assert.equal(result.status, "weak-password-refused");
    assert.equal(await collections.users().countDocuments({}), 0);
  });

  it("NEVER touches an existing account, even with different credentials configured", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "first@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();

    const before = await collections.users().findOne({ email: "first@example.com" });
    assert.ok(before);

    // Someone changes the environment hoping to reset a forgotten password.
    process.env.SEED_ADMIN_EMAIL = "attacker@example.com";
    process.env.SEED_ADMIN_PASSWORD = "AttackerPassword123";
    bootstrap.resetBootstrapCacheForTests();

    const result = await bootstrap.ensureAdminBootstrapped();
    assert.equal(result.status, "already-provisioned");

    assert.equal(
      await collections.users().countDocuments({ email: "attacker@example.com" }),
      0,
      "must not create a second account",
    );
    const after = await collections.users().findOne({ email: "first@example.com" });
    assert.equal(after!.passwordHash, before.passwordHash, "must not change the password");
  });

  it("is idempotent across repeated calls", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "RealPassword123",
    });

    assert.equal((await bootstrap.ensureAdminBootstrapped()).status, "created");
    assert.equal((await bootstrap.ensureAdminBootstrapped()).status, "already-provisioned");
    assert.equal((await bootstrap.ensureAdminBootstrapped()).status, "already-provisioned");
    assert.equal(await collections.users().countDocuments({}), 1);
  });

  it("leaves the catalogue alone unless demo seeding is asked for", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "RealPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();
    assert.equal(await collections.gems().countDocuments({}), 0);
  });

  it("populates the demo catalogue when SEED_DEMO_CATALOGUE is set", async () => {
    const { bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "RealPassword123",
      SEED_DEMO_CATALOGUE: "true",
    });

    await bootstrap.ensureAdminBootstrapped();
    assert.equal(await collections.gems().countDocuments({}), 23);
    assert.equal(await collections.categories().countDocuments({}), 7);
  });
});
