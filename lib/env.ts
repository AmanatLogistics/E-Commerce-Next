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

/**
 * The documented defaults. They are published in the README, so an account must never be
 * created with them on a hosted deployment — bootstrap refuses, rather than standing up an
 * admin whose password anyone can read.
 */
export const DEFAULT_ADMIN_EMAIL = "admin@royalemeraldcrest.example";
export const DEFAULT_ADMIN_PASSWORD = "AdminPass123!";

export const env = {
  isProd,

  /** When set, the real MongoDB driver is used. When absent, the in-memory driver is. */
  mongodbUri: process.env.MONGODB_URI ?? null,
  mongodbDb: process.env.MONGODB_DB ?? "royal_emerald_crest",

  /**
   * Where the in-memory driver persists, so `npm run seed`, `next dev` and Playwright
   * (three separate processes) see the same data. Ignored when MONGODB_URI is set.
   */
  get memoryDbFile(): string {
    return process.env.REC_MEMORY_DB ?? ".rec-data/db.json";
  },

  /**
   * In production this must be set explicitly; a fixed dev fallback keeps sessions stable
   * across restarts locally without ever shipping a real secret.
   *
   * A getter, not a value: a production *build* runs with NODE_ENV=production but has no
   * runtime secret, so validating this at module-evaluation time would make `next build`
   * fail on a machine that is merely compiling. Resolving it on first use moves the error
   * to the first request that actually needs to sign or verify a session, which is where
   * a missing secret genuinely matters.
   */
  get authSecret(): string {
    return required(
      "AUTH_SECRET",
      process.env.AUTH_SECRET,
      isProd ? undefined : "dev-only-insecure-secret-do-not-use-in-production",
    );
  },

  /*
   * Getters rather than values. A hosted platform sets the environment before the process
   * starts, so this makes no difference there — but reading at use rather than at import
   * keeps the behaviour observable from a test, and these are the values that decide
   * whether an account gets created.
   */
  get seedAdminEmail(): string {
    return process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
  },
  get seedAdminPassword(): string {
    return process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  },

  /**
   * Whether the admin credentials were actually supplied, rather than falling back to the
   * documented defaults. On a hosted deployment there is no shell to run a seed script in,
   * so the first sign-in provisions the admin from these — but only when they were really
   * set. See lib/auth/bootstrap.ts.
   */
  get adminCredentialsConfigured(): boolean {
    return (
      (process.env.SEED_ADMIN_EMAIL ?? "").length > 0 &&
      (process.env.SEED_ADMIN_PASSWORD ?? "").length > 0
    );
  },

  /**
   * Optional: populate the demo catalogue on first boot when the shop is empty. Useful for
   * a first deployment, so the storefront has something to show before any stone has been
   * entered by hand. Never overwrites anything.
   */
  get seedDemoCatalogue(): boolean {
    return process.env.SEED_DEMO_CATALOGUE === "true";
  },

  /**
   * SMTP. When SMTP_HOST is absent, enquiry emails are written to a local outbox instead
   * of being sent, so the flow is still observable end to end with nothing configured.
   */
  smtp: {
    host: process.env.SMTP_HOST ?? null,
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
  },
  /** Where enquiry notifications go, and what address they come from. */
  enquiryRecipient: process.env.ENQUIRY_RECIPIENT ?? "",
  mailFrom: process.env.MAIL_FROM ?? "",
  /** Outbox directory used when SMTP is not configured. */
  mailOutbox: process.env.MAIL_OUTBOX ?? ".rec-data/outbox",
} as const;

