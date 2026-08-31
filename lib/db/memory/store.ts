/**
 * File-backed document store for the in-memory driver.
 *
 * It is file-backed rather than purely in-process because `npm run seed`, `next dev` and
 * the Playwright runner are three separate processes that must see the same data. The whole
 * database is a single JSON file; at this catalogue size (tens of documents) reading and
 * rewriting it per mutation is far below the noise floor, and it keeps the implementation
 * small enough to trust. Writes go through a temp file + rename so a crash mid-write cannot
 * leave a truncated database.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ObjectId } from "mongodb";

type Doc = Record<string, unknown>;
type Data = Record<string, Doc[]>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OID = /^__oid:([0-9a-f]{24})$/;

/** Dates and ObjectIds do not survive JSON, so they are tagged on the way out. */
function encode(value: unknown): unknown {
  if (value instanceof ObjectId) return `__oid:${value.toHexString()}`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out: Doc = {};
    for (const [k, v] of Object.entries(value as Doc)) out[k] = encode(v);
    return out;
  }
  return value;
}

function decode(value: unknown): unknown {
  if (typeof value === "string") {
    const oid = OID.exec(value);
    if (oid) return new ObjectId(oid[1]);
    if (ISO_DATE.test(value)) return new Date(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    const out: Doc = {};
    for (const [k, v] of Object.entries(value as Doc)) out[k] = decode(v);
    return out;
  }
  return value;
}

export class MemoryStore {
  private data: Data = {};
  private loadedMtimeMs = -1;
  private readonly file: string;

  constructor(file: string) {
    // turbopackIgnore: the path is configuration, not a module reference, so it must not
    // drag the whole project into the server bundle's file trace.
    this.file = resolve(/* turbopackIgnore: true */ process.cwd(), file);
  }

  /**
   * Reload when another process has written since our last read, so the dev server picks
   * up a re-seed without a restart.
   */
  private sync(): void {
    if (!existsSync(this.file)) {
      if (this.loadedMtimeMs !== -1) {
        this.data = {};
        this.loadedMtimeMs = -1;
      }
      return;
    }
    const mtime = statSync(this.file).mtimeMs;
    if (mtime === this.loadedMtimeMs) return;
    try {
      const raw = JSON.parse(readFileSync(this.file, "utf8")) as Data;
      const next: Data = {};
      for (const [name, docs] of Object.entries(raw)) {
        next[name] = docs.map((d) => decode(d) as Doc);
      }
      this.data = next;
      this.loadedMtimeMs = mtime;
    } catch {
      // A partially written file is treated as empty rather than crashing the server.
      this.data = {};
    }
  }

  private persist(): void {
    const encoded: Data = {};
    for (const [name, docs] of Object.entries(this.data)) {
      encoded[name] = docs.map((d) => encode(d) as Doc);
    }
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(encoded), "utf8");
    renameSync(tmp, this.file);
    this.loadedMtimeMs = statSync(this.file).mtimeMs;
  }

  collection(name: string): Doc[] {
    this.sync();
    this.data[name] ??= [];
    return this.data[name];
  }

  commit(): void {
    this.persist();
  }

  dropAll(): void {
    this.data = {};
    this.persist();
  }
}

let singleton: MemoryStore | null = null;

export function getMemoryStore(file: string): MemoryStore {
  singleton ??= new MemoryStore(file);
  return singleton;
}
