import "server-only";

/**
 * Tolerating an unreachable database during `next build`, and only then.
 *
 * Several pages read the catalogue while being prerendered — the header's variety rail,
 * the home page, and generateStaticParams for the stone pages. On a hosting platform the
 * build machine is not the same host as the running app, and it frequently cannot reach
 * the database: MongoDB Atlas blocks unknown IPs by default, and a build machine's address
 * is not knowable in advance. The result was a deploy that failed outright with
 * "Failed to collect page data", which says nothing about the actual cause.
 *
 * A build should never depend on a database being reachable. When one is not, these pages
 * fall back to empty and are served on demand instead, which is what they would have done
 * anyway on a cache miss. At RUNTIME the same failure is rethrown, because a database
 * outage while serving real traffic must not be swallowed.
 */

function isBuildPhase(): boolean {
  // Set by `next build`; see next/dist/shared/lib/constants.js.
  return process.env.NEXT_PHASE === "phase-production-build";
}

let warned = false;

export async function readDuringBuild<T>(
  label: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isBuildPhase()) throw error;

    if (!warned) {
      warned = true;
      console.warn(
        "\n⚠  The database was not reachable during the build, so pages that read it are " +
          "being\n   left to render on demand instead. The deployment will still work, " +
          "provided the\n   running app can reach it.\n\n" +
          "   If the site is empty once deployed, the app cannot reach the database " +
          "either. The\n   usual cause is MongoDB Atlas's IP access list: a hosted build " +
          "and a hosted app both\n   come from addresses you cannot predict, so Atlas must " +
          "be set to allow access from\n   anywhere (0.0.0.0/0) under Network Access.\n",
      );
    }
    console.warn(`   ↳ skipped during build: ${label} (${(error as Error).message})`);
    return fallback;
  }
}
