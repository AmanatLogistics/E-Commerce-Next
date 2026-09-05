import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";

/**
 * The password reset is the one thing in the application that can change an existing
 * account, so what it REFUSES matters more than what it does.
 *
 * The point of the whole design is that only the person who administers the deployment can
 * reach it — through a server-side variable, never through anything a request carries. These
 * pin down that it stays off unless explicitly asked for, that it applies the same strength
 * rules as first-run provisioning, and that it does not quietly re-apply itself afterwards
 * and revert a password changed later in the admin panel.
 */

const dir = mkdtempSync(join(tmpdir(), "rec-recovery-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;

async function withEnv(vars: Record<string, string | undefined>) {
  n += 1;
  process.env.REC_MEMORY_DB = join(dir, `db-${n}.json`);
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const recovery = await import("../../lib/auth/recovery");
  const bootstrap = await import("../../lib/auth/bootstrap");
  const collections = await import("../../lib/db/collections");
  const { resetMemoryStoreForTests } = await import("../../lib/db/memory/store");

  recovery.resetRecoveryCacheForTests();
  bootstrap.resetBootstrapCacheForTests();
  resetMemoryStoreForTests();
  collections.resetCollectionCacheForTests();

  return { recovery, bootstrap, collections };
}

beforeEach(() => {
  delete process.env.SEED_ADMIN_EMAIL;
  delete process.env.SEED_ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD_RESET;
});

describe("the administrator password reset", () => {
  it("does nothing at all unless ADMIN_PASSWORD_RESET is set", async () => {
    const { recovery, bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();
    const before = await collections.users().findOne({ email: "owner@example.com" });

    // The variable is absent, and the configured password has since changed.
    process.env.SEED_ADMIN_PASSWORD = "SecondPassword123";
    const result = await recovery.applyAdminPasswordReset();

    assert.equal(result.status, "not-requested");
    const after = await collections.users().findOne({ email: "owner@example.com" });
    assert.equal(after?.passwordHash, before?.passwordHash, "the account must be untouched");
  });

  it("applies the configured password to the existing account when asked", async () => {
    const { recovery, bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();

    process.env.SEED_ADMIN_PASSWORD = "SecondPassword123";
    process.env.ADMIN_PASSWORD_RESET = "true";
    const result = await recovery.applyAdminPasswordReset();
    assert.equal(result.status, "reset");

    const { verifyPassword } = await import("../../lib/auth/password");
    const admin = await collections.users().findOne({ email: "owner@example.com" });
    assert.ok(admin);
    assert.ok(
      await verifyPassword("SecondPassword123", admin.passwordHash),
      "the new password must open the account",
    );
    assert.equal(
      await verifyPassword("FirstPassword123", admin.passwordHash),
      false,
      "the old password must stop working",
    );
    // Every session signed under the old password has to end with it.
    assert.ok(admin.tokenVersion > 0);
  });

  it("moves the one existing account when the address changed too", async () => {
    const { recovery, bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "old-address@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassw0rd123",
    });
    await bootstrap.ensureAdminBootstrapped();
    const original = await collections.users().findOne({ email: "old-address@example.com" });
    assert.ok(original);

    // Both variables changed. Upserting the new address would leave two administrators:
    // the new one, and an orphan nobody can name that still opens with the old password.
    process.env.SEED_ADMIN_EMAIL = "new-address@example.com";
    process.env.SEED_ADMIN_PASSWORD = "SecondPassw0rd123";
    process.env.ADMIN_PASSWORD_RESET = "true";

    assert.equal((await recovery.applyAdminPasswordReset()).status, "moved");

    const all = await collections.users().find({});
    assert.equal(all.length, 1, "there must still be exactly one administrator");
    assert.equal(all[0].email, "new-address@example.com");
    assert.equal(
      all[0]._id.toHexString(),
      original._id.toHexString(),
      "it must be the same account, moved — not a replacement",
    );

    const { verifyPassword } = await import("../../lib/auth/password");
    assert.ok(await verifyPassword("SecondPassw0rd123", all[0].passwordHash));
    assert.ok(all[0].tokenVersion > original.tokenVersion, "old sessions must be ended");
  });

  it("refuses the README's public example password", async () => {
    const { recovery, bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();
    const before = await collections.users().findOne({ email: "owner@example.com" });

    const { DEFAULT_ADMIN_PASSWORD } = await import("../../lib/env");
    process.env.SEED_ADMIN_PASSWORD = DEFAULT_ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD_RESET = "true";

    const result = await recovery.applyAdminPasswordReset();
    assert.equal(result.status, "default-password-refused");
    const after = await collections.users().findOne({ email: "owner@example.com" });
    assert.equal(after?.passwordHash, before?.passwordHash);
  });

  it("refuses a password too weak for the rule the rest of the app enforces", async () => {
    const { recovery, bootstrap } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();

    process.env.SEED_ADMIN_PASSWORD = "short";
    process.env.ADMIN_PASSWORD_RESET = "true";

    assert.equal(
      (await recovery.applyAdminPasswordReset()).status,
      "weak-password-refused",
    );
  });

  it("applies once, so a password changed later in the admin panel is not reverted", async () => {
    const { recovery, bootstrap, collections } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
      ADMIN_PASSWORD_RESET: "true",
    });
    await bootstrap.ensureAdminBootstrapped();

    assert.equal((await recovery.applyAdminPasswordReset()).status, "reset");
    const afterReset = await collections.users().findOne({ email: "owner@example.com" });

    // A second call, with the variable still set, must not re-hash anything.
    assert.equal((await recovery.applyAdminPasswordReset()).status, "reset");
    const afterSecond = await collections.users().findOne({ email: "owner@example.com" });
    assert.equal(afterSecond?.passwordHash, afterReset?.passwordHash);
    assert.equal(afterSecond?.tokenVersion, afterReset?.tokenVersion);
  });
});

describe("diagnosing configured credentials", () => {
  it("separates a wrong address from a wrong password", async () => {
    const { recovery, bootstrap } = await withEnv({
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "FirstPassword123",
    });
    await bootstrap.ensureAdminBootstrapped();

    assert.deepEqual(await recovery.diagnoseConfiguredCredentials(), {
      emailMatches: true,
      passwordMatches: true,
    });

    process.env.SEED_ADMIN_PASSWORD = "SecondPassword123";
    assert.deepEqual(await recovery.diagnoseConfiguredCredentials(), {
      emailMatches: true,
      passwordMatches: false,
    });

    process.env.SEED_ADMIN_EMAIL = "someone-else@example.com";
    assert.deepEqual(await recovery.diagnoseConfiguredCredentials(), {
      emailMatches: false,
      passwordMatches: null,
    });
  });

  it("spots the two ways a dashboard mangles a pasted value", async () => {
    const { recovery } = await withEnv({});
    const { inspectValue } = recovery;

    assert.deepEqual(inspectValue("Passw0rd!x"), {
      hasEdgeWhitespace: false,
      looksQuoted: false,
    });
    // The trailing newline nobody can see in a dashboard field, and cannot type back.
    assert.equal(inspectValue("Passw0rd!x\n").hasEdgeWhitespace, true);
    assert.equal(inspectValue(" Passw0rd!x").hasEdgeWhitespace, true);
    // Quotes meant as .env syntax, stored literally by a hosting dashboard.
    assert.equal(inspectValue('"Passw0rd!x"').looksQuoted, true);
    assert.equal(inspectValue("'Passw0rd!x'").looksQuoted, true);
    // An apostrophe inside a password is not a quoted value.
    assert.equal(inspectValue("it's-a-Passw0rd").looksQuoted, false);
  });
});
