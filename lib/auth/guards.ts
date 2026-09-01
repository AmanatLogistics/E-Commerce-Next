import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { UserDoc } from "../db/documents";

/**
 * These throw (redirect() throws) rather than returning a boolean, on purpose. A guard
 * that returns a value can be called and its result ignored; one that throws cannot be
 * forgotten halfway through a handler.
 *
 * Every admin page, server action and route handler calls one of these itself. The
 * middleware check is a first line of defence and never the only one: a Server Action is a
 * POST to the page's own endpoint, and a stale cookie claiming `role: "admin"` passes a
 * signature check but must still fail the database re-check that getCurrentUser() performs.
 *
 * next/navigation's forbidden() and unauthorized() are deliberately not used: they are
 * experimental and require experimental.authInterrupts, and the authorisation path is the
 * last place to depend on an unstable API.
 */

export async function requireAdmin(next = "/admin"): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For server actions, where redirecting a POST would hide the failure from the caller. */
export async function requireAdminAction(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: this action requires an administrator.");
  }
  return user;
}

/** True only for a real, enabled admin. For conditionally rendering admin-only UI. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
