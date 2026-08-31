import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { env } from "../env";
import { users } from "../db/collections";
import type { Role, UserDoc } from "../db/documents";

export const SESSION_COOKIE = "kg_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionClaims {
  sub: string;
  email: string;
  role: Role;
  /** Mirrors user.tokenVersion; bumping the user's version invalidates every session. */
  ver: number;
}

const secret = new TextEncoder().encode(env.authSecret);

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role, ver: claims.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifies the signature and shape only. It does NOT prove the user still exists, is still
 * enabled, or still holds the role in the token — a cookie is attacker-influenced input and
 * roles change after issue. Anything that grants access must call getCurrentUser().
 */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const { sub, email, role, ver } = payload as Record<string, unknown>;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    if (role !== "admin") return null;
    if (typeof ver !== "number") return null;
    return { sub, email, role, ver };
  } catch {
    return null;
  }
}

export async function setSessionCookie(claims: SessionClaims): Promise<void> {
  const token = await createSessionToken(claims);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * The authoritative answer to "who is this request". Re-reads the user from the database
 * on every call, so a disabled account, a changed role, or a bumped tokenVersion takes
 * effect immediately rather than at cookie expiry.
 */
export async function getCurrentUser(): Promise<UserDoc | null> {
  const claims = await getSessionClaims();
  if (!claims) return null;
  if (!ObjectId.isValid(claims.sub)) return null;

  const user = await users().findOne({ _id: new ObjectId(claims.sub) });
  if (!user) return null;
  if (user.disabled) return null;
  if (user.tokenVersion !== claims.ver) return null;
  return user;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** The only shape of a user allowed to cross to the client. Never carries passwordHash. */
export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
