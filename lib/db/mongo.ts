import "server-only";
import { MongoClient, type Collection, type Db, type Document, type Sort } from "mongodb";
import { env } from "../env";
import type {
  BaseDoc,
  GemCollection,
  DeleteResult,
  Filter,
  FindOptions,
  IndexSpec,
  InsertOneResult,
  TextSearchOptions,
  UpdateResult,
  UpdateSpec,
} from "./types";

/**
 * A single client is cached on globalThis so Next's dev hot-reload, which re-evaluates
 * modules on every change, cannot open a new pool per reload and exhaust Atlas's
 * connection limit. This is the cached-connection helper the spec calls for.
 */
declare global {
  var __kgMongo: { client: MongoClient; promise: Promise<MongoClient> } | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!env.mongodbUri) throw new Error("MONGODB_URI is not set");
  if (!globalThis.__kgMongo) {
    const client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 10,
      retryWrites: true,
    });
    globalThis.__kgMongo = { client, promise: client.connect() };
  }
  return globalThis.__kgMongo.promise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(env.mongodbDb);
}

export async function closeMongo(): Promise<void> {
  if (globalThis.__kgMongo) {
    await globalThis.__kgMongo.client.close();
    globalThis.__kgMongo = undefined;
  }
}

/** Adapts the official driver to the narrow GemCollection surface. */
export class MongoBackedCollection<T extends BaseDoc> implements GemCollection<T> {
  constructor(private readonly name: string) {}

  private async col(): Promise<Collection<Document>> {
    const db = await getDb();
    return db.collection(this.name);
  }

  async findOne(filter: Filter<T>, options?: FindOptions): Promise<T | null> {
    const col = await this.col();
    const doc = await col.findOne(filter as Document, {
      sort: options?.sort as Sort | undefined,
      projection: options?.projection,
    });
    return (doc as T | null) ?? null;
  }

  async find(filter: Filter<T>, options: FindOptions = {}): Promise<T[]> {
    const col = await this.col();
    let cursor = col.find(filter as Document, { projection: options.projection });
    if (options.sort) cursor = cursor.sort(options.sort as Sort);
    if (options.skip) cursor = cursor.skip(options.skip);
    if (options.limit !== undefined) cursor = cursor.limit(options.limit);
    return (await cursor.toArray()) as T[];
  }

  async countDocuments(filter: Filter<T> = {} as Filter<T>): Promise<number> {
    const col = await this.col();
    return col.countDocuments(filter as Document);
  }

  async distinct<V = unknown>(field: string, filter: Filter<T> = {} as Filter<T>): Promise<V[]> {
    const col = await this.col();
    return (await col.distinct(field, filter as Document)) as V[];
  }

  async insertOne(doc: Omit<T, "_id">): Promise<InsertOneResult> {
    const col = await this.col();
    const res = await col.insertOne(doc as Document);
    return { insertedId: res.insertedId };
  }

  async insertMany(docs: Omit<T, "_id">[]): Promise<{ insertedCount: number }> {
    const col = await this.col();
    const res = await col.insertMany(docs as Document[]);
    return { insertedCount: res.insertedCount };
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateSpec<T>,
    options: { upsert?: boolean } = {},
  ): Promise<UpdateResult> {
    const col = await this.col();
    const res = await col.updateOne(filter as Document, update as Document, {
      upsert: options.upsert,
    });
    return {
      matchedCount: res.matchedCount,
      modifiedCount: res.modifiedCount,
      upsertedId: res.upsertedId ?? null,
    };
  }

  async updateMany(filter: Filter<T>, update: UpdateSpec<T>): Promise<UpdateResult> {
    const col = await this.col();
    const res = await col.updateMany(filter as Document, update as Document);
    return {
      matchedCount: res.matchedCount,
      modifiedCount: res.modifiedCount,
      upsertedId: res.upsertedId ?? null,
    };
  }

  async deleteOne(filter: Filter<T>): Promise<DeleteResult> {
    const col = await this.col();
    const res = await col.deleteOne(filter as Document);
    return { deletedCount: res.deletedCount };
  }

  async deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    const col = await this.col();
    const res = await col.deleteMany(filter as Document);
    return { deletedCount: res.deletedCount };
  }

  /** Uses the collection's `$text` index and sorts by MongoDB's own relevance score. */
  async textSearch(query: string, filter: Filter<T>, options: TextSearchOptions): Promise<T[]> {
    const col = await this.col();
    let cursor = col
      .find(
        { ...(filter as Document), $text: { $search: query } },
        { projection: { ...options.projection, __score: { $meta: "textScore" } } },
      )
      .sort({ __score: { $meta: "textScore" } } as unknown as Sort);
    if (options.skip) cursor = cursor.skip(options.skip);
    if (options.limit !== undefined) cursor = cursor.limit(options.limit);
    const docs = (await cursor.toArray()) as (T & { __score?: number })[];
    // The projected relevance score is an implementation detail of this method.
    return docs.map((doc) => {
      const copy = { ...doc };
      delete copy.__score;
      return copy as unknown as T;
    });
  }

  async createIndexes(specs: IndexSpec[]): Promise<void> {
    const col = await this.col();
    for (const spec of specs) {
      await col.createIndex(spec.key as Document, {
        unique: spec.unique,
        sparse: spec.sparse,
        name: spec.name,
        weights: spec.weights,
        expireAfterSeconds: spec.expireAfterSeconds,
      });
    }
  }
}
