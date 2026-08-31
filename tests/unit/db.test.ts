import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { ObjectId } from "mongodb";
import { MemoryCollection } from "../../lib/db/memory/collection";
import { MemoryStore } from "../../lib/db/memory/store";
import type { BaseDoc } from "../../lib/db/types";

const dir = mkdtempSync(join(tmpdir(), "chowk-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

interface Widget extends BaseDoc {
  name: string;
  brand: string;
  description: string;
  price: number;
  stock: number;
  tags: string[];
  published: boolean;
  deletedAt: Date | null;
}

let n = 0;
function makeCollection() {
  n += 1;
  const store = new MemoryStore(join(dir, `db-${n}.json`));
  return new MemoryCollection<Widget>(store, "widgets");
}

function widget(over: Partial<Widget> = {}): Omit<Widget, "_id"> {
  return {
    name: "Kettle",
    brand: "Acme",
    description: "A stainless steel kettle",
    price: 100,
    stock: 5,
    tags: ["kitchen"],
    published: true,
    deletedAt: null,
    ...over,
  };
}

describe("memory driver: filtering", () => {
  it("matches equality, comparison, set and existence operators", async () => {
    const c = makeCollection();
    await c.insertMany([
      widget({ name: "Kettle", price: 100, stock: 0 }),
      widget({ name: "Toaster", price: 250, stock: 3 }),
      widget({ name: "Blender", price: 500, stock: 9, published: false }),
    ]);

    assert.equal((await c.find({ name: "Toaster" })).length, 1);
    assert.equal((await c.find({ price: { $gte: 250 } })).length, 2);
    assert.equal((await c.find({ price: { $gt: 100, $lt: 500 } })).length, 1);
    assert.equal((await c.find({ name: { $in: ["Kettle", "Blender"] } })).length, 2);
    assert.equal((await c.find({ name: { $nin: ["Kettle"] } })).length, 2);
    assert.equal((await c.find({ published: true })).length, 2);
    assert.equal((await c.find({ stock: { $gt: 0 } })).length, 2);
    assert.equal((await c.find({ deletedAt: null })).length, 3);
    assert.equal((await c.find({ missingField: { $exists: false } })).length, 3);
  });

  it("matches an array field when any element matches, as MongoDB does", async () => {
    const c = makeCollection();
    await c.insertOne(widget({ tags: ["kitchen", "small-appliance"] }));
    assert.equal((await c.find({ tags: "kitchen" })).length, 1);
    assert.equal((await c.find({ tags: "audio" })).length, 0);
  });

  it("combines $and and $or", async () => {
    const c = makeCollection();
    await c.insertMany([
      widget({ name: "Kettle", price: 100 }),
      widget({ name: "Toaster", price: 250 }),
      widget({ name: "Blender", price: 500 }),
    ]);
    const hits = await c.find({
      $and: [{ price: { $gte: 100 } }, { $or: [{ name: "Kettle" }, { name: "Blender" }] }],
    });
    assert.deepEqual(hits.map((h) => h.name).sort(), ["Blender", "Kettle"]);
  });

  it("throws on an unsupported operator instead of silently matching nothing", async () => {
    const c = makeCollection();
    await c.insertOne(widget());
    await assert.rejects(() => c.find({ price: { $mod: [2, 0] } } as never), /Unsupported query operator/);
  });

  it("compares ObjectId and Date by value", async () => {
    const c = makeCollection();
    const id = new ObjectId();
    const when = new Date("2026-01-01T00:00:00.000Z");
    await c.insertOne({ ...widget(), _id: id, deletedAt: when });
    assert.ok(await c.findOne({ _id: new ObjectId(id.toHexString()) }));
    assert.ok(await c.findOne({ deletedAt: { $lt: new Date("2026-06-01T00:00:00.000Z") } }));
  });
});

describe("memory driver: sort, paginate, project", () => {
  it("sorts, skips and limits", async () => {
    const c = makeCollection();
    await c.insertMany([
      widget({ name: "A", price: 300 }),
      widget({ name: "B", price: 100 }),
      widget({ name: "C", price: 200 }),
    ]);
    const asc = await c.find({}, { sort: { price: 1 } });
    assert.deepEqual(asc.map((d) => d.name), ["B", "C", "A"]);
    const page2 = await c.find({}, { sort: { price: 1 }, skip: 1, limit: 1 });
    assert.deepEqual(page2.map((d) => d.name), ["C"]);
  });

  it("applies inclusion and exclusion projections", async () => {
    const c = makeCollection();
    await c.insertOne(widget({ name: "Kettle" }));
    const inc = await c.findOne({}, { projection: { name: 1 } });
    assert.deepEqual(Object.keys(inc!).sort(), ["_id", "name"]);
    const exc = await c.findOne({}, { projection: { description: 0 } });
    assert.equal("description" in exc!, false);
    assert.equal(exc!.name, "Kettle");
  });

  it("returns clones, so a caller cannot mutate the store by accident", async () => {
    const c = makeCollection();
    await c.insertOne(widget({ name: "Kettle" }));
    const found = await c.findOne({});
    found!.name = "Tampered";
    assert.equal((await c.findOne({}))!.name, "Kettle");
  });
});

describe("memory driver: updates", () => {
  it("applies $set, $inc, $push and $pull", async () => {
    const c = makeCollection();
    await c.insertOne(widget({ name: "Kettle", stock: 5, tags: ["kitchen", "sale"] }));
    await c.updateOne({ name: "Kettle" }, { $set: { name: "Electric Kettle" } });
    await c.updateOne({ name: "Electric Kettle" }, { $inc: { stock: -2 } });
    await c.updateOne({ name: "Electric Kettle" }, { $push: { tags: "new" } });
    await c.updateOne({ name: "Electric Kettle" }, { $pull: { tags: "sale" } });
    const doc = await c.findOne({});
    assert.equal(doc!.name, "Electric Kettle");
    assert.equal(doc!.stock, 3);
    assert.deepEqual(doc!.tags, ["kitchen", "new"]);
  });

  it("reports modifiedCount 0 when an update changes nothing", async () => {
    const c = makeCollection();
    await c.insertOne(widget({ name: "Kettle" }));
    const res = await c.updateOne({ name: "Kettle" }, { $set: { name: "Kettle" } });
    assert.equal(res.matchedCount, 1);
    assert.equal(res.modifiedCount, 0);
  });

  it("upserts using the filter's equality fields and honours $setOnInsert", async () => {
    const c = makeCollection();
    const res = await c.updateOne(
      { name: "Grinder" },
      { $set: { stock: 4 }, $setOnInsert: { price: 999 } },
      { upsert: true },
    );
    assert.ok(res.upsertedId);
    const doc = await c.findOne({ name: "Grinder" });
    assert.equal(doc!.stock, 4);
    assert.equal(doc!.price, 999);

    await c.updateOne(
      { name: "Grinder" },
      { $set: { stock: 7 }, $setOnInsert: { price: 1 } },
      { upsert: true },
    );
    const after = await c.findOne({ name: "Grinder" });
    assert.equal(after!.stock, 7);
    assert.equal(after!.price, 999, "$setOnInsert must not apply on an update");
  });

  it("updateMany reports matched and modified separately", async () => {
    const c = makeCollection();
    await c.insertMany([widget({ stock: 1 }), widget({ stock: 2 }), widget({ stock: 3 })]);
    const res = await c.updateMany({ stock: { $lte: 2 } }, { $inc: { stock: 10 } });
    assert.equal(res.matchedCount, 2);
    assert.equal(res.modifiedCount, 2);
  });
});

describe("memory driver: unique indexes", () => {
  it("rejects a duplicate with a code 11000 error, as the real driver does", async () => {
    const c = makeCollection();
    await c.createIndexes([{ key: { name: 1 }, unique: true }]);
    await c.insertOne(widget({ name: "Kettle" }));
    await assert.rejects(
      () => c.insertOne(widget({ name: "Kettle" })),
      (err: Error & { code?: number }) => err.code === 11000,
    );
  });

  it("a sparse unique index ignores documents missing the key", async () => {
    const c = makeCollection();
    await c.createIndexes([{ key: { guestToken: 1 }, unique: true, sparse: true }]);
    await c.insertOne({ ...widget(), guestToken: null } as never);
    await c.insertOne({ ...widget(), guestToken: null } as never);
    assert.equal(await c.countDocuments({}), 2);
  });
});

describe("memory driver: weighted text search", () => {
  const weights = { name: 10, brand: 5, description: 1 };

  it("ranks a title match above a description match", async () => {
    const c = makeCollection();
    await c.insertMany([
      widget({ name: "Steel Kettle", description: "Boils water" }),
      widget({ name: "Coffee Grinder", description: "Pairs well with a kettle" }),
    ]);
    const hits = await c.textSearch("kettle", {}, { weights });
    assert.equal(hits[0].name, "Steel Kettle");
    assert.equal(hits.length, 2);
  });

  it("ranks a document matching more query terms higher", async () => {
    const c = makeCollection();
    await c.insertMany([
      widget({ name: "Wireless Earbuds", description: "Bluetooth" }),
      widget({ name: "Wireless Mouse", description: "Ergonomic" }),
    ]);
    const hits = await c.textSearch("wireless earbuds", {}, { weights });
    assert.equal(hits[0].name, "Wireless Earbuds");
  });

  it("respects the filter, so unpublished products stay out of results", async () => {
    const c = makeCollection();
    await c.insertMany([
      widget({ name: "Kettle One", published: true }),
      widget({ name: "Kettle Two", published: false }),
    ]);
    const hits = await c.textSearch("kettle", { published: true }, { weights });
    assert.deepEqual(hits.map((h) => h.name), ["Kettle One"]);
  });

  it("returns nothing for a query that matches nothing", async () => {
    const c = makeCollection();
    await c.insertOne(widget({ name: "Kettle" }));
    assert.deepEqual(await c.textSearch("refrigerator", {}, { weights }), []);
  });
});

describe("memory driver: persistence across processes", () => {
  it("a second store instance reads what the first wrote", async () => {
    const file = join(dir, "shared.json");
    const a = new MemoryCollection<Widget>(new MemoryStore(file), "widgets");
    await a.insertOne(widget({ name: "Persisted", stock: 7 }));

    const b = new MemoryCollection<Widget>(new MemoryStore(file), "widgets");
    const found = await b.findOne({ name: "Persisted" });
    assert.equal(found!.stock, 7);
    assert.ok(found!._id instanceof ObjectId, "ObjectId must survive the JSON round trip");
  });

  it("Date values survive the round trip as Dates", async () => {
    const file = join(dir, "dates.json");
    const when = new Date("2026-03-04T05:06:07.000Z");
    const a = new MemoryCollection<Widget>(new MemoryStore(file), "widgets");
    await a.insertOne(widget({ deletedAt: when }));
    const b = new MemoryCollection<Widget>(new MemoryStore(file), "widgets");
    const found = await b.findOne({});
    assert.ok(found!.deletedAt instanceof Date);
    assert.equal(found!.deletedAt!.getTime(), when.getTime());
  });
});
