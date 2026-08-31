import type { ObjectId } from "mongodb";

export type { ObjectId };

/** Any stored document. `_id` is always present once persisted. */
export interface BaseDoc {
  _id: ObjectId;
}

export type Primitive = string | number | boolean | Date | ObjectId | null;

/** The comparison operators this codebase is allowed to use. */
export interface QueryOperators {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number | Date;
  $gte?: number | Date;
  $lt?: number | Date;
  $lte?: number | Date;
  $in?: unknown[];
  $nin?: unknown[];
  $exists?: boolean;
  $regex?: string;
  $options?: string;
}

export type FieldCondition = Primitive | QueryOperators | unknown[];

export type Filter<T> = {
  [K in keyof T]?: FieldCondition;
} & {
  $and?: Filter<T>[];
  $or?: Filter<T>[];
  [key: string]: unknown;
};

/** The update operators this codebase is allowed to use. */
export interface UpdateSpec<T> {
  $set?: Partial<Record<keyof T | string, unknown>>;
  $setOnInsert?: Partial<Record<keyof T | string, unknown>>;
  $inc?: Partial<Record<keyof T | string, number>>;
  $push?: Partial<Record<keyof T | string, unknown>>;
  $pull?: Partial<Record<keyof T | string, unknown>>;
  $unset?: Partial<Record<keyof T | string, "">>;
}

export type SortSpec = Record<string, 1 | -1>;

export interface FindOptions {
  sort?: SortSpec;
  skip?: number;
  limit?: number;
  projection?: Record<string, 0 | 1>;
}

export interface TextSearchOptions extends Omit<FindOptions, "sort"> {
  /** Field weights, mirroring the text index weights declared in docs/SPEC.md §2. */
  weights: Record<string, number>;
}

export interface InsertOneResult {
  insertedId: ObjectId;
}
export interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedId: ObjectId | null;
}
export interface DeleteResult {
  deletedCount: number;
}

export interface IndexSpec {
  key: Record<string, 1 | -1 | "text">;
  unique?: boolean;
  sparse?: boolean;
  name?: string;
  weights?: Record<string, number>;
  expireAfterSeconds?: number;
}

/**
 * The narrow slice of the official driver's Collection API that this application uses.
 * Two implementations exist (see docs/SPEC.md §9): the real mongodb driver, and an
 * in-process store used when MONGODB_URI is absent. Application code only ever sees this.
 */
export interface ChowkCollection<T extends BaseDoc> {
  findOne(filter: Filter<T>, options?: FindOptions): Promise<T | null>;
  find(filter: Filter<T>, options?: FindOptions): Promise<T[]>;
  countDocuments(filter?: Filter<T>): Promise<number>;
  distinct<V = unknown>(field: string, filter?: Filter<T>): Promise<V[]>;
  insertOne(doc: Omit<T, "_id"> & { _id?: ObjectId }): Promise<InsertOneResult>;
  insertMany(docs: (Omit<T, "_id"> & { _id?: ObjectId })[]): Promise<{ insertedCount: number }>;
  updateOne(
    filter: Filter<T>,
    update: UpdateSpec<T>,
    options?: { upsert?: boolean },
  ): Promise<UpdateResult>;
  updateMany(filter: Filter<T>, update: UpdateSpec<T>): Promise<UpdateResult>;
  deleteOne(filter: Filter<T>): Promise<DeleteResult>;
  deleteMany(filter: Filter<T>): Promise<DeleteResult>;
  /**
   * Weighted full-text search. Backed by a MongoDB `$text` index in production and by an
   * equivalent scorer in the in-memory driver. Results are ordered by descending score.
   */
  textSearch(query: string, filter: Filter<T>, options: TextSearchOptions): Promise<T[]>;
  createIndexes(specs: IndexSpec[]): Promise<void>;
}
