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

/**
 * Options the connection string already sets are left alone: an operator who tuned their
 * URI means it, and silently overriding them makes the URI a lie.
 */
function uriSets(uri: string, option: string): boolean {
  const query = uri.slice(uri.indexOf("?") + 1);
  return uri.includes("?") && new RegExp(`(^|&)${option}=`, "i").test(query);
}

function clientPromise(): Promise<MongoClient> {
  const uri = env.mongodbUri;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalThis.__kgMongo) {
    /*
     * Serverless timings, not the driver's defaults.
     *
     * serverSelectionTimeoutMS defaults to 30 seconds, which is longer than a Vercel
     * function is allowed to run. A slow or refused first connection therefore killed the
     * whole request before the driver ever gave up, and the visitor got a blank error page
     * instead of anything that explained itself. Failing in 8 seconds leaves room for the
     * error to be reported and for the next request to try again.
     *
     * maxIdleTimeMS matters for the opposite reason: a serverless instance sits idle
     * between bursts, and releasing those sockets keeps a shared Atlas cluster (500
     * connections on the free tier) from filling up with dead ones.
     */
    const defaults: Record<string, number> = {
      serverSelectionTimeoutMS: 8_000,
      connectTimeoutMS: 8_000,
      socketTimeoutMS: 20_000,
      maxIdleTimeMS: 60_000,
    };
    const tuning = Object.fromEntries(
      Object.entries(defaults).filter(([option]) => !uriSets(uri, option)),
    );

    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
      ...tuning,
    });

    /*
     * A rejected connection must NEVER stay in the cache.
     *
     * The first version stored this promise unconditionally. When a cold start failed to
     * reach Atlas — a timeout, a DNS blip, a cluster still waking up — the REJECTED promise
     * was cached on globalThis, and every later request handled by that same instance
     * re-awaited the same rejection. That instance was broken for good while its neighbours
     * served the same site perfectly, which is exactly the "reload it a few times and it
     * works" symptom: each reload is a coin toss over which instance answers.
     *
     * Clearing the cache on failure means the next request builds a fresh client and gets a
     * real second chance. The identity check makes that safe against a reconnect that has
     * already happened in the meantime: only the entry that failed removes itself.
     */
    const entry: { client: MongoClient; promise: Promise<MongoClient> } = {
      client,
      promise: client.connect().catch((error: unknown) => {
        if (globalThis.__kgMongo === entry) globalThis.__kgMongo = undefined;
        void client.close().catch(() => {});
        throw error;
      }),
    };
    globalThis.__kgMongo = entry;
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

/**
 * Why index creation failed, if it did.
 *
 * The failure is deliberately not fatal — a database user without the right to create an
 * index can still read and write, and taking the site down over a missing index would be
 * worse than running without one. But swallowing it into a server log nobody reads meant a
 * read-only database user looked exactly like a healthy one until search 500'd. /api/health
 * reports whatever is recorded here.
 */
const indexErrors = new Map<string, string>();

export function indexCreationErrors(): Record<string, string> {
  return Object.fromEntries(indexErrors);
}

/** Adapts the official driver to the narrow GemCollection surface. */
export class MongoBackedCollection<T extends BaseDoc> implements GemCollection<T> {
  /** Runs at most once per collection per process; see col() below. */
  private indexesReady: Promise<void> | null = null;

  constructor(
    private readonly name: string,
    private readonly indexSpecs: IndexSpec[] = [],
  ) {}

  /**
   * Creates this collection's indexes on first use.
   *
   * They used to be created only by `npm run seed`, `npm run admin`, or first-run
   * provisioning. On a hosted deployment none of those need ever have run before a visitor
   * arrives, and a search then failed outright — MongoDB rejects a $text query when there
   * is no text index, so the storefront 500'd on a database that was otherwise perfectly
   * healthy. createIndex is idempotent and cheap, so doing it here removes that whole class
   * of failure.
   *
   * A failure to create them is logged but not fatal: a read-only database user cannot
   * create indexes, and queries should still work (more slowly) rather than the site going
   * down over it.
   */
  private ensureIndexesOnce(): Promise<void> {
    this.indexesReady ??= (async () => {
      if (this.indexSpecs.length === 0) return;
      try {
        const db = await getDb();
        const col = db.collection(this.name);
        for (const spec of this.indexSpecs) {
          await col.createIndex(spec.key as Document, {
            unique: spec.unique,
            sparse: spec.sparse,
            name: spec.name,
            weights: spec.weights,
            expireAfterSeconds: spec.expireAfterSeconds,
          });
        }
        indexErrors.delete(this.name);
      } catch (error) {
        indexErrors.set(this.name, (error as Error).message);
        console.warn(
          `Could not create indexes on "${this.name}": ${(error as Error).message}. ` +
            "Queries will still run, but more slowly, and text search will not work.",
        );
      }
    })();
    return this.indexesReady;
  }

  private async col(): Promise<Collection<Document>> {
    const db = await getDb();
    await this.ensureIndexesOnce();
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
