import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

/**
 * The signing key is resolved in one place because two places would eventually disagree:
 * the app signs the session cookie and proxy.ts verifies it on the edge runtime, and a
 * mismatch would reject every session with no obvious cause.
 */

async function freshResolver() {
  // The resolver memoises for the life of a process, and Node will not re-evaluate the
  // module, so the memo is cleared explicitly instead.
  const mod = await import("../../lib/auth/secret");
  mod.resetSessionKeyCacheForTests();
  return mod;
}

beforeEach(() => {
  delete process.env.AUTH_SECRET;
  delete process.env.MONGODB_URI;
});

describe("session signing key", () => {
  it("uses AUTH_SECRET when it is set", async () => {
    process.env.AUTH_SECRET = "an-explicit-secret";
    const { resolveSessionKey } = await freshResolver();
    assert.deepEqual(await resolveSessionKey(), new TextEncoder().encode("an-explicit-secret"));
  });

  it("derives a key from MONGODB_URI when AUTH_SECRET is absent", async () => {
    process.env.MONGODB_URI = "mongodb+srv://user:pw@cluster.example.net/";
    const { resolveSessionKey } = await freshResolver();
    const key = await resolveSessionKey();

    assert.equal(key.length, 32, "a SHA-256 digest");
    assert.notDeepEqual(
      key,
      new TextEncoder().encode(process.env.MONGODB_URI),
      "must be a digest, never the connection string itself",
    );
  });

  it("derives the SAME key from the same URI, which is what makes it usable", async () => {
    // Every serverless instance must reach the same key, or cookies issued by one are
    // rejected by the next. This is why a random per-instance secret would not do.
    process.env.MONGODB_URI = "mongodb+srv://user:pw@cluster.example.net/";
    const a = await (await freshResolver()).resolveSessionKey();
    const b = await (await freshResolver()).resolveSessionKey();
    assert.deepEqual(a, b);
  });

  it("derives a different key from a different URI", async () => {
    process.env.MONGODB_URI = "mongodb+srv://user:pw@one.example.net/";
    const a = await (await freshResolver()).resolveSessionKey();
    process.env.MONGODB_URI = "mongodb+srv://user:pw@two.example.net/";
    const b = await (await freshResolver()).resolveSessionKey();
    assert.notDeepEqual(a, b);
  });

  it("prefers AUTH_SECRET over the derived key when both are available", async () => {
    process.env.MONGODB_URI = "mongodb+srv://user:pw@cluster.example.net/";
    process.env.AUTH_SECRET = "an-explicit-secret";
    const { resolveSessionKey } = await freshResolver();
    assert.deepEqual(await resolveSessionKey(), new TextEncoder().encode("an-explicit-secret"));
  });

  it("reports when it has fallen back to the development key", async () => {
    const withNeither = await freshResolver();
    assert.equal(withNeither.usingInsecureDevKey(), true);

    process.env.MONGODB_URI = "mongodb+srv://user:pw@cluster.example.net/";
    const withUri = await freshResolver();
    assert.equal(withUri.usingInsecureDevKey(), false);
  });
});
