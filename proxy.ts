import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { resolveSessionKey } from "@/lib/auth/secret";

/**
 * First line of defence only.
 *
 * The middleware runs before the route and rejects the obvious cases cheaply, but it
 * verifies a *signature*, not a fact: a token issued before a role change or an account
 * being disabled still passes here. Every admin page and server action therefore repeats
 * the check against the database via requireAdmin()/requireAdminAction()
 * (lib/auth/guards.ts). Neither check is sufficient alone; both are cheap.
 *
 * Kept free of database and Node-only imports so it stays compatible with the edge runtime.
 *
 * This is Next 16's `proxy.ts` convention, which replaced `middleware.ts`.
 */

const SESSION_COOKIE = "rec_session";

async function roleFromRequest(request: NextRequest): Promise<"admin" | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await resolveSessionKey(), {
      algorithms: ["HS256"],
    });
    const role = (payload as { role?: unknown }).role;
    return role === "admin" ? role : null;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const role = await roleFromRequest(request);

  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
