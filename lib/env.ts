/**
 * Server-only environment access. Nothing secret is ever prefixed NEXT_PUBLIC_,
 * so nothing secret can reach the client bundle.
 */
import "server-only";

function required(name: string, value: string | undefined, fallback?: string): string {
  if (value && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(
    `Missing required environment variable ${name}. Copy .env.example to .env.local.`,
  );
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,

  /** When set, the real MongoDB driver is used. When absent, the in-memory driver is. */
  mongodbUri: process.env.MONGODB_URI ?? null,
  mongodbDb: process.env.MONGODB_DB ?? "chowk",

  /**
   * Where the in-memory driver persists, so `npm run seed`, `next dev` and Playwright
   * (three separate processes) see the same data. Ignored when MONGODB_URI is set.
   */
  memoryDbFile: process.env.CHOWK_MEMORY_DB ?? ".chowk-data/db.json",

  /**
   * In production this must be set explicitly; a fixed dev fallback keeps sessions
   * stable across restarts locally without ever shipping a real secret.
   */
  authSecret: required(
    "AUTH_SECRET",
    process.env.AUTH_SECRET,
    isProd ? undefined : "dev-only-insecure-secret-do-not-use-in-production",
  ),

  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@chowk.example",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "AdminPass123!",
} as const;

