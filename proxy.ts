import { NextResponse, type NextRequest } from "next/server";

/**
 * A cheap first pass in front of /admin, and nothing more.
 *
 * It checks only whether a session cookie is PRESENT. It deliberately does not verify the
 * signature, read the database, or trust anything the cookie claims.
 *
 * That is not a weakening. Every admin page and every admin server action calls
 * requireAdmin()/requireAdminAction() (lib/auth/guards.ts), which verifies the signature,
 * re-reads the user from the database, and re-checks the role and token version. A forged
 * or expired cookie gets past this file and is then rejected there, one hop later, with the
 * same redirect to /login. The check that matters has always been the server-side one.
 *
 * Verifying here used to mean the edge runtime needed the signing key too — and when that
 * key is derived from MONGODB_URI, the edge and the app can resolve different keys and
 * every valid session is rejected, bouncing an administrator back to /login forever. A
 * whole class of "works locally, broken once deployed" for no security gain at all.
 *
 * Kept free of database, crypto and Node-only imports so it stays edge-compatible.
 *
 * This is Next 16's `proxy.ts` convention, which replaced `middleware.ts`.
 */

const SESSION_COOKIE = "rec_session";

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (pathname.startsWith("/admin") && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
