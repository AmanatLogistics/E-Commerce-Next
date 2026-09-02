import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { usingMemoryDriver } from "@/lib/db/collections";
import { usingInsecureDevKey } from "@/lib/auth/secret";
import { isSmtpConfigured } from "@/lib/email/mailer";
import { siteConfig } from "@/lib/site-config";

/**
 * A one-request answer to "why is the site not working".
 *
 * Debugging a hosted deployment otherwise means reading a stack trace in a log viewer and
 * guessing which environment variable is at fault. This reports what the app can actually
 * see: whether it reaches the database, what is in it, whether the indexes exist, and which
 * pieces of configuration are set.
 *
 * Everything here is a boolean, a count or a name. No connection string, no credential, no
 * email address, no secret — the whole point is that it is safe to open in a browser and
 * paste to someone who is helping you.
 */

export const dynamic = "force-dynamic";

interface Check {
  ok: boolean;
  detail: string;
}

export async function GET() {
  const checks: Record<string, Check> = {};
  let httpStatus = 200;

  // --- configuration, which needs no database ---
  checks.database_configured = env.mongodbUri
    ? { ok: true, detail: `MongoDB driver, database "${env.mongodbDb}"` }
    : {
        ok: false,
        detail:
          "MONGODB_URI is not set, so the local file store is being used. That cannot work " +
          "on a serverless host — set MONGODB_URI.",
      };

  checks.admin_credentials_configured = env.adminCredentialsConfigured
    ? { ok: true, detail: "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are both set" }
    : {
        ok: false,
        detail:
          "SEED_ADMIN_EMAIL and/or SEED_ADMIN_PASSWORD are not set, so no administrator " +
          "can be created on first sign-in.",
      };

  checks.session_key = usingInsecureDevKey()
    ? {
        ok: false,
        detail:
          "Falling back to the built-in development key because neither AUTH_SECRET nor " +
          "MONGODB_URI is set. Sign-ins will not persist.",
      }
    : {
        ok: true,
        detail: process.env.AUTH_SECRET ? "using AUTH_SECRET" : "derived from MONGODB_URI",
      };

  checks.email = isSmtpConfigured()
    ? { ok: true, detail: "SMTP configured; enquiry notifications are sent" }
    : {
        ok: true,
        detail:
          "SMTP not configured. Enquiries are still recorded in the admin inbox; no email " +
          "is sent.",
      };

  checks.site_url = { ok: true, detail: siteConfig.url };

  // --- the database itself ---
  let counts: Record<string, number> | null = null;
  let gemIndexes: string[] | null = null;

  try {
    const { gems, categories, enquiries, users } = await import("@/lib/db/collections");

    counts = {
      stones: await gems().countDocuments({}),
      varieties: await categories().countDocuments({}),
      enquiries: await enquiries().countDocuments({}),
      administrators: await users().countDocuments({}),
    };

    checks.database_reachable = { ok: true, detail: "connected and queried successfully" };

    checks.catalogue =
      counts.stones > 0
        ? { ok: true, detail: `${counts.stones} stones, ${counts.varieties} varieties` }
        : {
            ok: false,
            detail:
              "The catalogue is empty, so the storefront will look blank. Add stones in " +
              "/admin, or set SEED_DEMO_CATALOGUE=true before the first sign-in.",
          };

    checks.administrator =
      counts.administrators > 0
        ? { ok: true, detail: "an administrator exists; sign in at /login" }
        : {
            ok: false,
            detail:
              "No administrator yet. It is created on the first sign-in from " +
              "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.",
          };

    // Index names, for the real MongoDB only — the local store has nothing to report.
    if (env.mongodbUri) {
      try {
        const { getDb } = await import("@/lib/db/mongo");
        const db = await getDb();
        const indexes = await db.collection("gems").indexes();
        gemIndexes = indexes.map((index) => index.name ?? "(unnamed)");
        const hasText = indexes.some((index) =>
          Object.values(index.key ?? {}).includes("text"),
        );
        checks.search_index = hasText
          ? { ok: true, detail: "text index present; search works" }
          : {
              ok: false,
              detail:
                "No text index on the gems collection, so search will fail. It is created " +
                "automatically on first use; if it is still missing, the database user may " +
                "not be allowed to create indexes.",
            };
      } catch (error) {
        /*
         * A collection that has never been written to does not exist yet, and asking it for
         * its indexes throws. That is an empty database, not an unreachable one — reporting
         * it as a connection failure would send someone hunting the wrong problem.
         */
        checks.search_index = {
          ok: true,
          detail:
            "No gems collection yet, so there are no indexes to report. They are created " +
            `on first write. (${(error as Error).message})`,
        };
      }
    }
  } catch (error) {
    httpStatus = 503;
    checks.database_reachable = {
      ok: false,
      detail:
        `Could not reach the database: ${(error as Error).message}. ` +
        "The usual cause on a hosted deployment is MongoDB Atlas's IP access list — a " +
        "hosted app comes from an address you cannot predict, so Atlas must allow access " +
        "from anywhere (0.0.0.0/0) under Network Access.",
    };
  }

  const failing = Object.entries(checks).filter(([, check]) => !check.ok);

  return NextResponse.json(
    {
      status: failing.length === 0 ? "ok" : "needs attention",
      driver: usingMemoryDriver ? "local file store (development only)" : "mongodb",
      problems: failing.map(([name]) => name),
      checks,
      counts,
      gemIndexes,
    },
    { status: httpStatus, headers: { "Cache-Control": "no-store" } },
  );
}
