import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

/**
 * The connection cache — the one piece of the MongoDB path that can be exercised without a
 * MongoDB.
 *
 * It matters more than its size suggests. A serverless instance keeps this module alive
 * across requests, so whatever is cached here outlives the request that put it there — and
 * the first version cached the promise returned by connect() whether it resolved or
 * REJECTED. One cold start that could not reach Atlas therefore poisoned that instance for
 * good: every later request re-awaited the same stored rejection while other instances
 * served the same site perfectly. That is precisely the "reload it a few times and it
 * works" failure, and it is invisible in a log because each individual error looks like an
 * ordinary timeout.
 */

// Somewhere nothing listens, so connect() is guaranteed to fail. The short timeout in the
// URI also proves the point of the second assertion below.
const UNREACHABLE = "mongodb://127.0.0.1:1/rec_test?serverSelectionTimeoutMS=250";

const previous = process.env.MONGODB_URI;
process.env.MONGODB_URI = UNREACHABLE;
after(() => {
  if (previous === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = previous;
});

describe("the MongoDB connection cache", () => {
  it("does not keep a failed connection, so the next request can retry", async () => {
    const { getDb } = await import("../../lib/db/mongo");

    await assert.rejects(getDb(), "an unreachable database must reject");
    assert.equal(
      globalThis.__kgMongo,
      undefined,
      "the rejected connection must be cleared, or every later request on this instance " +
        "re-awaits the same failure",
    );

    // The second attempt has to be a real attempt, not the first one's corpse.
    await assert.rejects(getDb());
    assert.equal(globalThis.__kgMongo, undefined);
  });

  it("lets the connection string's own timeout win over our default", async () => {
    const { getDb } = await import("../../lib/db/mongo");

    const started = Date.now();
    await assert.rejects(getDb());
    /*
     * The URI asks for 250ms. Our 8-second default would apply too if the options object
     * overrode the URI — which it does, unless the option is left out when the URI already
     * sets it. Anything under a couple of seconds can only be the URI's value.
     */
    assert.ok(
      Date.now() - started < 2_000,
      "the URI's serverSelectionTimeoutMS must not be overridden by our default",
    );
  });
});
