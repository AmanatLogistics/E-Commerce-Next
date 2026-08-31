/**
 * Query matching, update application and sorting for the in-memory driver.
 * Deliberately supports exactly the operators declared in lib/db/types.ts and no more —
 * an unsupported operator throws loudly rather than silently matching nothing, so a
 * mismatch between this and the real driver surfaces as a test failure, not as wrong data.
 */
import { ObjectId } from "mongodb";
import type { Filter, SortSpec, UpdateSpec } from "../types";

const SUPPORTED_OPS = new Set([
  "$eq", "$ne", "$gt", "$gte", "$lt", "$lte",
  "$in", "$nin", "$exists", "$regex", "$options",
]);

export function getPath(doc: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, doc);
}

function setPath(doc: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function unsetPath(doc: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const next = cur[parts[i]];
    if (typeof next !== "object" || next === null) return;
    cur = next as Record<string, unknown>;
  }
  delete cur[parts[parts.length - 1]];
}

/** Normalise to something comparable so ObjectId and Date compare by value, not identity. */
function comparable(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number | boolean;
}

function looseEqual(a: unknown, b: unknown): boolean {
  // MongoDB matches an array field when any element equals the operand.
  if (Array.isArray(a) && !Array.isArray(b)) return a.some((el) => looseEqual(el, b));
  return comparable(a) === comparable(b);
}

function compare(a: unknown, b: unknown): number {
  const x = comparable(a);
  const y = comparable(b);
  if (x === null && y === null) return 0;
  if (x === null) return -1;
  if (y === null) return 1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y));
}

function matchOperators(value: unknown, cond: Record<string, unknown>): boolean {
  for (const [op, operand] of Object.entries(cond)) {
    if (!SUPPORTED_OPS.has(op)) {
      throw new Error(
        `Unsupported query operator "${op}" in the in-memory driver. ` +
          `Add it to lib/db/memory/matcher.ts and to lib/db/types.ts, or rewrite the query.`,
      );
    }
    switch (op) {
      case "$eq":
        if (!looseEqual(value, operand)) return false;
        break;
      case "$ne":
        if (looseEqual(value, operand)) return false;
        break;
      case "$gt":
        if (!(compare(value, operand) > 0)) return false;
        break;
      case "$gte":
        if (!(compare(value, operand) >= 0)) return false;
        break;
      case "$lt":
        if (!(compare(value, operand) < 0)) return false;
        break;
      case "$lte":
        if (!(compare(value, operand) <= 0)) return false;
        break;
      case "$in":
        if (!(operand as unknown[]).some((o) => looseEqual(value, o))) return false;
        break;
      case "$nin":
        if ((operand as unknown[]).some((o) => looseEqual(value, o))) return false;
        break;
      case "$exists":
        if ((value !== undefined) !== Boolean(operand)) return false;
        break;
      case "$regex": {
        const flags = typeof cond.$options === "string" ? cond.$options : "";
        if (typeof value !== "string") return false;
        if (!new RegExp(operand as string, flags).test(value)) return false;
        break;
      }
      case "$options":
        break; // consumed by $regex
      default:
        return false;
    }
  }
  return true;
}

function isOperatorObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof ObjectId) &&
    Object.keys(value).every((k) => k.startsWith("$"))
  );
}

export function matches<T>(doc: T, filter: Filter<T>): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (cond === undefined) continue;

    if (key === "$and") {
      if (!(cond as Filter<T>[]).every((f) => matches(doc, f))) return false;
      continue;
    }
    if (key === "$or") {
      const branches = cond as Filter<T>[];
      if (branches.length > 0 && !branches.some((f) => matches(doc, f))) return false;
      continue;
    }
    if (key.startsWith("$")) {
      throw new Error(`Unsupported top-level query operator "${key}" in the in-memory driver.`);
    }

    const value = getPath(doc, key);
    if (isOperatorObject(cond)) {
      if (!matchOperators(value, cond)) return false;
    } else if (!looseEqual(value, cond)) {
      return false;
    }
  }
  return true;
}

export function sortDocs<T>(docs: T[], sort: SortSpec | undefined): T[] {
  if (!sort) return docs;
  const entries = Object.entries(sort);
  if (entries.length === 0) return docs;
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const r = compare(getPath(a, field), getPath(b, field));
      if (r !== 0) return dir === 1 ? r : -r;
    }
    return 0;
  });
}

export function project<T extends Record<string, unknown>>(
  doc: T,
  projection: Record<string, 0 | 1> | undefined,
): T {
  if (!projection) return doc;
  const keys = Object.keys(projection);
  if (keys.length === 0) return doc;
  const including = keys.some((k) => projection[k] === 1);
  const out: Record<string, unknown> = {};
  if (including) {
    out._id = doc._id;
    for (const k of keys) if (projection[k] === 1) out[k] = doc[k];
  } else {
    Object.assign(out, doc);
    for (const k of keys) if (projection[k] === 0) delete out[k];
  }
  return out as T;
}

/** Applies an update spec in place to a cloned document. Returns whether anything changed. */
export function applyUpdate<T extends Record<string, unknown>>(
  doc: T,
  update: UpdateSpec<T>,
  isInsert: boolean,
): boolean {
  const before = JSON.stringify(doc);

  for (const [op, payload] of Object.entries(update)) {
    if (!payload) continue;
    const fields = payload as Record<string, unknown>;
    switch (op) {
      case "$set":
        for (const [k, v] of Object.entries(fields)) setPath(doc, k, v);
        break;
      case "$setOnInsert":
        if (isInsert) for (const [k, v] of Object.entries(fields)) setPath(doc, k, v);
        break;
      case "$unset":
        for (const k of Object.keys(fields)) unsetPath(doc, k);
        break;
      case "$inc":
        for (const [k, v] of Object.entries(fields)) {
          const cur = getPath(doc, k);
          setPath(doc, k, (typeof cur === "number" ? cur : 0) + (v as number));
        }
        break;
      case "$push":
        for (const [k, v] of Object.entries(fields)) {
          const cur = getPath(doc, k);
          setPath(doc, k, Array.isArray(cur) ? [...cur, v] : [v]);
        }
        break;
      case "$pull":
        for (const [k, v] of Object.entries(fields)) {
          const cur = getPath(doc, k);
          if (!Array.isArray(cur)) continue;
          setPath(
            doc,
            k,
            cur.filter((el) =>
              isOperatorObject(v) ? !matchOperators(el, v) : !looseEqual(el, v),
            ),
          );
        }
        break;
      default:
        throw new Error(
          `Unsupported update operator "${op}" in the in-memory driver. ` +
            `Add it to lib/db/memory/matcher.ts and to lib/db/types.ts.`,
        );
    }
  }
  return JSON.stringify(doc) !== before;
}

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "for", "with", "of", "in", "to"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Mirrors a weighted MongoDB text index closely enough to be useful: a term scores per
 * weighted field, a title hit outranks a description hit, and a document matching more
 * of the query's terms outranks one matching fewer. It is not bit-identical to MongoDB's
 * ranking, which is documented in docs/SPEC.md §9.
 */
export function textScore(
  doc: Record<string, unknown>,
  terms: string[],
  weights: Record<string, number>,
): number {
  if (terms.length === 0) return 0;
  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    let termScore = 0;
    for (const [field, weight] of Object.entries(weights)) {
      const raw = getPath(doc, field);
      if (typeof raw !== "string") continue;
      const tokens = tokenize(raw);
      const exact = tokens.filter((t) => t === term).length;
      const prefix = tokens.filter((t) => t !== term && t.startsWith(term)).length;
      if (exact || prefix) termScore += weight * (exact + prefix * 0.4);
    }
    if (termScore > 0) matchedTerms += 1;
    score += termScore;
  }

  if (matchedTerms === 0) return 0;
  // Reward covering more of the query, so "wireless earbuds" beats a doc matching only one.
  return score * (matchedTerms / terms.length);
}
