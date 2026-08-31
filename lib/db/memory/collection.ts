import { ObjectId } from "mongodb";
import type {
  BaseDoc,
  ChowkCollection,
  DeleteResult,
  Filter,
  FindOptions,
  IndexSpec,
  InsertOneResult,
  TextSearchOptions,
  UpdateResult,
  UpdateSpec,
} from "../types";
import { applyUpdate, matches, project, sortDocs, textScore, tokenize } from "./matcher";
import type { MemoryStore } from "./store";

type Doc = Record<string, unknown>;

/**
 * structuredClone cannot be used here: it copies an ObjectId's bytes but drops its
 * prototype, so ids come back as plain objects and every `instanceof ObjectId` and every
 * id comparison silently breaks. This clone preserves ObjectId and Date identity.
 */
function clone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof ObjectId) return new ObjectId(value.id) as unknown as T;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => clone(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = clone(v);
  return out as T;
}

export class MemoryCollection<T extends BaseDoc> implements ChowkCollection<T> {
  private uniqueKeys: string[][] = [];

  constructor(
    private readonly store: MemoryStore,
    private readonly name: string,
  ) {}

  private docs(): Doc[] {
    return this.store.collection(this.name);
  }

  private assertUnique(candidate: Doc, ignoreId?: ObjectId): void {
    for (const keys of this.uniqueKeys) {
      // A sparse unique index ignores documents missing the key, as MongoDB does.
      if (keys.some((k) => candidate[k] === undefined || candidate[k] === null)) continue;
      const clash = this.docs().find((d) => {
        if (ignoreId && String(d._id) === String(ignoreId)) return false;
        return keys.every((k) => String(d[k]) === String(candidate[k]));
      });
      if (clash) {
        const err = new Error(
          `E11000 duplicate key error collection: ${this.name} index: ${keys.join("_")}`,
        );
        (err as Error & { code: number }).code = 11000;
        throw err;
      }
    }
  }

  async findOne(filter: Filter<T>, options?: FindOptions): Promise<T | null> {
    const [doc] = await this.find(filter, { ...options, limit: 1 });
    return doc ?? null;
  }

  async find(filter: Filter<T>, options: FindOptions = {}): Promise<T[]> {
    const hits = this.docs().filter((d) => matches(d, filter as Filter<Doc>));
    let out = sortDocs(hits, options.sort);
    if (options.skip) out = out.slice(options.skip);
    if (options.limit !== undefined) out = out.slice(0, options.limit);
    return out.map((d) => clone(project(d, options.projection)) as T);
  }

  async countDocuments(filter: Filter<T> = {} as Filter<T>): Promise<number> {
    return this.docs().filter((d) => matches(d, filter as Filter<Doc>)).length;
  }

  async distinct<V = unknown>(field: string, filter: Filter<T> = {} as Filter<T>): Promise<V[]> {
    const seen = new Map<string, V>();
    for (const doc of this.docs()) {
      if (!matches(doc, filter as Filter<Doc>)) continue;
      const value = doc[field] as V;
      const values = Array.isArray(value) ? (value as V[]) : [value];
      for (const v of values) {
        if (v === undefined) continue;
        seen.set(String(v), v);
      }
    }
    return [...seen.values()];
  }

  async insertOne(doc: Omit<T, "_id"> & { _id?: ObjectId }): Promise<InsertOneResult> {
    const _id = doc._id ?? new ObjectId();
    const stored = clone({ ...doc, _id }) as Doc;
    this.assertUnique(stored);
    this.docs().push(stored);
    this.store.commit();
    return { insertedId: _id };
  }

  async insertMany(
    docs: (Omit<T, "_id"> & { _id?: ObjectId })[],
  ): Promise<{ insertedCount: number }> {
    for (const doc of docs) {
      const _id = doc._id ?? new ObjectId();
      const stored = clone({ ...doc, _id }) as Doc;
      this.assertUnique(stored);
      this.docs().push(stored);
    }
    this.store.commit();
    return { insertedCount: docs.length };
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateSpec<T>,
    options: { upsert?: boolean } = {},
  ): Promise<UpdateResult> {
    const docs = this.docs();
    const index = docs.findIndex((d) => matches(d, filter as Filter<Doc>));

    if (index === -1) {
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
      // Upsert seeds the new document from the filter's equality fields, as MongoDB does.
      const seed: Doc = { _id: new ObjectId() };
      for (const [k, v] of Object.entries(filter)) {
        if (!k.startsWith("$") && (typeof v !== "object" || v === null || v instanceof ObjectId || v instanceof Date)) {
          seed[k] = v;
        }
      }
      applyUpdate(seed, update as UpdateSpec<Doc>, true);
      this.assertUnique(seed);
      docs.push(seed);
      this.store.commit();
      return { matchedCount: 0, modifiedCount: 0, upsertedId: seed._id as ObjectId };
    }

    const next = clone(docs[index]);
    const changed = applyUpdate(next, update as UpdateSpec<Doc>, false);
    this.assertUnique(next, next._id as ObjectId);
    docs[index] = next;
    this.store.commit();
    return { matchedCount: 1, modifiedCount: changed ? 1 : 0, upsertedId: null };
  }

  async updateMany(filter: Filter<T>, update: UpdateSpec<T>): Promise<UpdateResult> {
    const docs = this.docs();
    let matchedCount = 0;
    let modifiedCount = 0;
    for (let i = 0; i < docs.length; i += 1) {
      if (!matches(docs[i], filter as Filter<Doc>)) continue;
      matchedCount += 1;
      const next = clone(docs[i]);
      if (applyUpdate(next, update as UpdateSpec<Doc>, false)) modifiedCount += 1;
      this.assertUnique(next, next._id as ObjectId);
      docs[i] = next;
    }
    if (matchedCount) this.store.commit();
    return { matchedCount, modifiedCount, upsertedId: null };
  }

  async deleteOne(filter: Filter<T>): Promise<DeleteResult> {
    const docs = this.docs();
    const index = docs.findIndex((d) => matches(d, filter as Filter<Doc>));
    if (index === -1) return { deletedCount: 0 };
    docs.splice(index, 1);
    this.store.commit();
    return { deletedCount: 1 };
  }

  async deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    const docs = this.docs();
    let deletedCount = 0;
    for (let i = docs.length - 1; i >= 0; i -= 1) {
      if (!matches(docs[i], filter as Filter<Doc>)) continue;
      docs.splice(i, 1);
      deletedCount += 1;
    }
    if (deletedCount) this.store.commit();
    return { deletedCount };
  }

  async textSearch(
    query: string,
    filter: Filter<T>,
    options: TextSearchOptions,
  ): Promise<T[]> {
    const terms = tokenize(query);
    const scored = this.docs()
      .filter((d) => matches(d, filter as Filter<Doc>))
      .map((doc) => ({ doc, score: textScore(doc, terms, options.weights) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    let out = scored.map((r) => r.doc);
    if (options.skip) out = out.slice(options.skip);
    if (options.limit !== undefined) out = out.slice(0, options.limit);
    return out.map((d) => clone(project(d, options.projection)) as T);
  }

  async createIndexes(specs: IndexSpec[]): Promise<void> {
    // Only uniqueness is enforceable in-process; the rest of an index is a performance
    // property of the real server. Recording the unique keys keeps duplicate-key errors
    // behaving the same in both drivers, which is what application code depends on.
    this.uniqueKeys = specs
      .filter((s) => s.unique)
      .map((s) => Object.keys(s.key).filter((k) => s.key[k] !== "text"));
  }
}
