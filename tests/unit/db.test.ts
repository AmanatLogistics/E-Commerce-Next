import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { ObjectId } from "mongodb";
import { MemoryCollection } from "../../lib/db/memory/collection";
import { MemoryStore } from "../../lib/db/memory/store";
import type { BaseDoc } from "../../lib/db/types";

/**
 * The in-memory driver stands in for MongoDB when MONGODB_URI is absent (docs/SPEC.md §7).
 * These tests pin its behaviour to the real driver's, because a divergence here would show
 * up as wrong data rather than as an error.
 */

const dir = mkdtempSync(join(tmpdir(), "kg-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

interface Stone extends BaseDoc {
  title: string;
  reference: string;
  origin: string;
  description: string;
  carat: number;
  treatment: string;
  published: boolean;
  deletedAt: Date | null;
  tags: string[];
}

let n = 0;
function makeCollection() {
  n += 1;
  return new MemoryCollection<Stone>(new MemoryStore(join(dir, `db-${n}.json`)), "gems");
}

function stone(over: Partial<Stone> = {}): Omit<Stone, "_id"> {
  return {
    title: "Swat Emerald",
    reference: "KG-EM-0101",
    origin: "Swat Valley, Pakistan",
    description: "A green beryl",
    carat: 2.14,
    treatment: "None (untreated)",
    published: true,
    deletedAt: null,
    tags: ["emerald"],
    ...over,
  };
}

describe("in-memory driver: filtering", () => {
  it("matches equality, comparison, set and existence operators", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ title: "A", carat: 1, published: true }),
      stone({ title: "B", reference: "KG-RB-0201", carat: 3, published: true }),
      stone({ title: "C", reference: "KG-SP-0301", carat: 5, published: false }),
    ]);

    assert.equal((await c.find({ title: "B" })).length, 1);
    assert.equal((await c.find({ carat: { $gte: 3 } })).length, 2);
    assert.equal((await c.find({ carat: { $gt: 1, $lt: 5 } })).length, 1);
    assert.equal((await c.find({ title: { $in: ["A", "C"] } })).length, 2);
    assert.equal((await c.find({ title: { $nin: ["A"] } })).length, 2);
    assert.equal((await c.find({ published: true })).length, 2);
    assert.equal((await c.find({ deletedAt: null })).length, 3);
    assert.equal((await c.find({ nothingHere: { $exists: false } })).length, 3);
  });

  it("matches case-insensitively with an anchored regex, as the origin filter does", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ origin: "Hunza Valley, Pakistan" }),
      stone({ reference: "KG-2", origin: "Swat Valley, Pakistan" }),
    ]);
    assert.equal((await c.find({ origin: { $regex: "^hunza", $options: "i" } })).length, 1);
    assert.equal((await c.find({ origin: { $regex: "^valley", $options: "i" } })).length, 0);
  });

  it("matches an array field when any element matches, as MongoDB does", async () => {
    const c = makeCollection();
    await c.insertOne(stone({ tags: ["emerald", "untreated"] }));
    assert.equal((await c.find({ tags: "untreated" })).length, 1);
    assert.equal((await c.find({ tags: "ruby" })).length, 0);
  });

  it("combines $and and $or", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ title: "A", carat: 1 }),
      stone({ title: "B", reference: "KG-2", carat: 3 }),
      stone({ title: "C", reference: "KG-3", carat: 5 }),
    ]);
    const hits = await c.find({
      $and: [{ carat: { $gte: 1 } }, { $or: [{ title: "A" }, { title: "C" }] }],
    });
    assert.deepEqual(hits.map((h) => h.title).sort(), ["A", "C"]);
  });

  it("throws on an unsupported operator instead of silently matching nothing", async () => {
    const c = makeCollection();
    await c.insertOne(stone());
    await assert.rejects(
      () => c.find({ carat: { $mod: [2, 0] } } as never),
      /Unsupported query operator/,
    );
  });

  it("compares ObjectId and Date by value, not identity", async () => {
    const c = makeCollection();
    const id = new ObjectId();
    const when = new Date("2026-01-01T00:00:00.000Z");
    await c.insertOne({ ...stone(), _id: id, deletedAt: when });
    assert.ok(await c.findOne({ _id: new ObjectId(id.toHexString()) }));
    assert.ok(await c.findOne({ deletedAt: { $lt: new Date("2026-06-01T00:00:00.000Z") } }));
  });
});

describe("in-memory driver: sort, paginate, project", () => {
  it("sorts, skips and limits", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ title: "A", reference: "KG-1", carat: 3 }),
      stone({ title: "B", reference: "KG-2", carat: 1 }),
      stone({ title: "C", reference: "KG-3", carat: 2 }),
    ]);
    const asc = await c.find({}, { sort: { carat: 1 } });
    assert.deepEqual(asc.map((d) => d.title), ["B", "C", "A"]);
    const page2 = await c.find({}, { sort: { carat: 1 }, skip: 1, limit: 1 });
    assert.deepEqual(page2.map((d) => d.title), ["C"]);
  });

  it("applies inclusion and exclusion projections", async () => {
    const c = makeCollection();
    await c.insertOne(stone({ title: "Swat Emerald" }));
    const inc = await c.findOne({}, { projection: { title: 1 } });
    assert.deepEqual(Object.keys(inc!).sort(), ["_id", "title"]);
    const exc = await c.findOne({}, { projection: { description: 0 } });
    assert.equal("description" in exc!, false);
    assert.equal(exc!.title, "Swat Emerald");
  });

  it("returns clones, so a caller cannot mutate the store by accident", async () => {
    const c = makeCollection();
    await c.insertOne(stone({ title: "Swat Emerald" }));
    const found = await c.findOne({});
    found!.title = "Tampered";
    assert.equal((await c.findOne({}))!.title, "Swat Emerald");
  });
});

describe("in-memory driver: updates", () => {
  it("applies $set, $inc, $push and $pull", async () => {
    const c = makeCollection();
    await c.insertOne(stone({ title: "Emerald", carat: 2, tags: ["emerald", "sale"] }));
    await c.updateOne({ title: "Emerald" }, { $set: { title: "Swat Emerald" } });
    await c.updateOne({ title: "Swat Emerald" }, { $inc: { carat: 1 } });
    await c.updateOne({ title: "Swat Emerald" }, { $push: { tags: "featured" } });
    await c.updateOne({ title: "Swat Emerald" }, { $pull: { tags: "sale" } });

    const doc = await c.findOne({});
    assert.equal(doc!.title, "Swat Emerald");
    assert.equal(doc!.carat, 3);
    assert.deepEqual(doc!.tags, ["emerald", "featured"]);
  });

  it("reports modifiedCount 0 when an update changes nothing", async () => {
    const c = makeCollection();
    await c.insertOne(stone({ title: "Emerald" }));
    const res = await c.updateOne({ title: "Emerald" }, { $set: { title: "Emerald" } });
    assert.equal(res.matchedCount, 1);
    assert.equal(res.modifiedCount, 0);
  });

  it("upserts from the filter's equality fields and honours $setOnInsert", async () => {
    const c = makeCollection();
    const res = await c.updateOne(
      { title: "Ruby" },
      { $set: { carat: 4 }, $setOnInsert: { reference: "KG-RB-9999" } },
      { upsert: true },
    );
    assert.ok(res.upsertedId);

    const created = await c.findOne({ title: "Ruby" });
    assert.equal(created!.carat, 4);
    assert.equal(created!.reference, "KG-RB-9999");

    await c.updateOne(
      { title: "Ruby" },
      { $set: { carat: 7 }, $setOnInsert: { reference: "OVERWRITTEN" } },
      { upsert: true },
    );
    const updated = await c.findOne({ title: "Ruby" });
    assert.equal(updated!.carat, 7);
    assert.equal(updated!.reference, "KG-RB-9999", "$setOnInsert must not apply on an update");
  });

  it("updateMany reports matched and modified separately", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ reference: "KG-1", carat: 1 }),
      stone({ reference: "KG-2", carat: 2 }),
      stone({ reference: "KG-3", carat: 3 }),
    ]);
    const res = await c.updateMany({ carat: { $lte: 2 } }, { $inc: { carat: 10 } });
    assert.equal(res.matchedCount, 2);
    assert.equal(res.modifiedCount, 2);
  });
});

describe("in-memory driver: unique indexes", () => {
  it("rejects a duplicate with code 11000, as the real driver does", async () => {
    const c = makeCollection();
    await c.createIndexes([{ key: { reference: 1 }, unique: true }]);
    await c.insertOne(stone({ reference: "KG-EM-0101" }));
    await assert.rejects(
      () => c.insertOne(stone({ reference: "KG-EM-0101" })),
      (err: Error & { code?: number }) => err.code === 11000,
    );
  });

  it("a sparse unique index ignores documents missing the key", async () => {
    const c = makeCollection();
    await c.createIndexes([{ key: { certificate: 1 }, unique: true, sparse: true }]);
    await c.insertOne({ ...stone(), certificate: null } as never);
    await c.insertOne({ ...stone({ reference: "KG-2" }), certificate: null } as never);
    assert.equal(await c.countDocuments({}), 2);
  });
});

describe("in-memory driver: weighted text search", () => {
  const weights = { title: 10, reference: 8, origin: 4, description: 1 };

  it("ranks a title match above a description match", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ title: "Swat Emerald", reference: "KG-1", description: "Green beryl" }),
      stone({ title: "Hunza Ruby", reference: "KG-2", description: "Sits beside an emerald" }),
    ]);
    const hits = await c.textSearch("emerald", {}, { weights });
    assert.equal(hits[0].title, "Swat Emerald");
    assert.equal(hits.length, 2);
  });

  it("ranks a document matching more query terms higher", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ title: "Untreated Hunza Ruby", reference: "KG-1", description: "Corundum" }),
      stone({ title: "Hunza Spinel", reference: "KG-2", description: "Not corundum" }),
    ]);
    const hits = await c.textSearch("untreated ruby", {}, { weights });
    assert.equal(hits[0].title, "Untreated Hunza Ruby");
  });

  it("respects the filter, so unpublished stones stay out of results", async () => {
    const c = makeCollection();
    await c.insertMany([
      stone({ title: "Emerald One", reference: "KG-1", published: true }),
      stone({ title: "Emerald Two", reference: "KG-2", published: false }),
    ]);
    const hits = await c.textSearch("emerald", { published: true }, { weights });
    assert.deepEqual(hits.map((h) => h.title), ["Emerald One"]);
  });

  it("returns nothing for a query that matches nothing", async () => {
    const c = makeCollection();
    await c.insertOne(stone());
    assert.deepEqual(await c.textSearch("diamond", {}, { weights }), []);
  });
});

describe("in-memory driver: persistence across processes", () => {
  it("a second store instance reads what the first wrote", async () => {
    const file = join(dir, "shared.json");
    const a = new MemoryCollection<Stone>(new MemoryStore(file), "gems");
    await a.insertOne(stone({ title: "Persisted", carat: 7 }));

    const b = new MemoryCollection<Stone>(new MemoryStore(file), "gems");
    const found = await b.findOne({ title: "Persisted" });
    assert.equal(found!.carat, 7);
    assert.ok(found!._id instanceof ObjectId, "ObjectId must survive the JSON round trip");
  });

  it("Date values survive the round trip as Dates", async () => {
    const file = join(dir, "dates.json");
    const when = new Date("2026-03-04T05:06:07.000Z");
    const a = new MemoryCollection<Stone>(new MemoryStore(file), "gems");
    await a.insertOne(stone({ deletedAt: when }));

    const b = new MemoryCollection<Stone>(new MemoryStore(file), "gems");
    const found = await b.findOne({});
    assert.ok(found!.deletedAt instanceof Date);
    assert.equal(found!.deletedAt!.getTime(), when.getTime());
  });
});
