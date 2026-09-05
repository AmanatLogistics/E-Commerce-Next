import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

/**
 * Creating and changing staff accounts from inside the panel.
 *
 * The server actions themselves need a request context to test, so these cover the layer
 * underneath — the one that actually writes. What matters here is that creating is not
 * upserting: a create form that quietly overwrote an existing colleague's password, and
 * reported success while signing them out, would be a real incident, and upsertAdmin does
 * exactly that by design for the seed script.
 */

const dir = mkdtempSync(join(tmpdir(), "rec-accounts-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;

async function freshDb() {
  n += 1;
  process.env.REC_MEMORY_DB = join(dir, `db-${n}.json`);
  const account = await import("../../lib/auth/admin-account");
  const collections = await import("../../lib/db/collections");
  const { resetMemoryStoreForTests } = await import("../../lib/db/memory/store");
  resetMemoryStoreForTests();
  collections.resetCollectionCacheForTests();
  return { account, collections };
}

describe("creating a staff account", () => {
  it("creates an account that the sign-in path can verify", async () => {
    const { account, collections } = await freshDb();
    const result = await account.createAdminAccount(
      "  Colleague@Example.COM ",
      "  A Colleague  ",
      "Colleague123!x",
    );
    assert.equal(result.ok, true);

    const created = await collections.users().findOne({ email: "colleague@example.com" });
    assert.ok(created, "the address must be normalised the same way login normalises it");
    assert.equal(created.name, "A Colleague");
    assert.equal(created.role, "admin");
    assert.equal(created.disabled, false);
    assert.equal(created.tokenVersion, 0);

    const { verifyPassword } = await import("../../lib/auth/password");
    assert.ok(await verifyPassword("Colleague123!x", created.passwordHash));
    // The plaintext must never be what is stored.
    assert.notEqual(created.passwordHash, "Colleague123!x");
  });

  it("refuses a duplicate address instead of overwriting that person", async () => {
    const { account, collections } = await freshDb();
    await account.createAdminAccount("colleague@example.com", "First", "Colleague123!x");
    const before = await collections.users().findOne({ email: "colleague@example.com" });

    const second = await account.createAdminAccount(
      "COLLEAGUE@example.com",
      "Impostor",
      "Different123!x",
    );

    assert.equal(second.ok, false);
    assert.match(second.message ?? "", /already exists/);

    const after = await collections.users().findOne({ email: "colleague@example.com" });
    assert.equal(after?.name, "First", "the existing account must be untouched");
    assert.equal(after?.passwordHash, before?.passwordHash);
  });
});

describe("changing an account", () => {
  it("setting a password ends every session that account has open", async () => {
    const { account, collections } = await freshDb();
    await account.createAdminAccount("colleague@example.com", "A Colleague", "Colleague123!x");
    const before = await collections.users().findOne({ email: "colleague@example.com" });
    assert.ok(before);

    await account.setAccountPassword(before._id, "Replaced123!x");

    const after = await collections.users().findOne({ email: "colleague@example.com" });
    const { verifyPassword } = await import("../../lib/auth/password");
    assert.ok(await verifyPassword("Replaced123!x", after!.passwordHash));
    assert.equal(await verifyPassword("Colleague123!x", after!.passwordHash), false);
    assert.ok(
      after!.tokenVersion > before.tokenVersion,
      "without a version bump the old sessions stay valid until the cookie expires",
    );
  });

  it("suspending ends sessions; restoring does not disturb them again", async () => {
    const { account, collections } = await freshDb();
    await account.createAdminAccount("colleague@example.com", "A Colleague", "Colleague123!x");
    const created = await collections.users().findOne({ email: "colleague@example.com" });
    assert.ok(created);

    await account.setAccountDisabled(created._id, true);
    const suspended = await collections.users().findOne({ _id: created._id });
    assert.equal(suspended?.disabled, true);
    assert.ok(
      suspended!.tokenVersion > created.tokenVersion,
      "a suspension that leaves open sessions working means nothing until they expire",
    );

    await account.setAccountDisabled(created._id, false);
    const restored = await collections.users().findOne({ _id: created._id });
    assert.equal(restored?.disabled, false);
    assert.equal(restored?.tokenVersion, suspended?.tokenVersion);
  });

  it("counts only the accounts that can still sign in", async () => {
    const { account, collections } = await freshDb();
    await account.createAdminAccount("one@example.com", "One", "Colleague123!x");
    await account.createAdminAccount("two@example.com", "Two", "Colleague123!x");
    assert.equal(await account.enabledAccountCount(), 2);

    const two = await collections.users().findOne({ email: "two@example.com" });
    await account.setAccountDisabled(two!._id, true);
    // This count is what stops the last way in being suspended or deleted.
    assert.equal(await account.enabledAccountCount(), 1);
  });
});
