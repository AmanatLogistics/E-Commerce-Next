"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "../db/collections";
import { loginSchema } from "../validation/schemas";
import { verifyPassword } from "./password";
import { limits, rateLimit } from "./rate-limit";
import { clearSessionCookie, setSessionCookie } from "./session";
import { ensureAdminBootstrapped } from "./bootstrap";
import { fieldErrorsFrom, type FormState } from "../forms/state";

/**
 * There is no sign-up action, and no customer accounts. Buyers enquire; they never
 * register. The only account is the admin, created by `npm run seed`, so there is no code
 * path anywhere in the application that can create or promote an account.
 */

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  // Only same-origin relative paths, so `?next=` cannot become an open redirect.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { email, password } = parsed.data;
  const gate = rateLimit(
    `login:${await clientIp()}:${email}`,
    limits.login.limit,
    limits.login.windowMs,
  );
  if (!gate.ok) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${Math.ceil(gate.retryAfterSeconds / 60)} minutes.`,
    };
  }

  /*
   * On a hosted deployment there is no shell to run the seed in, so the administrator is
   * provisioned here from the environment — but only when the database holds no users at
   * all. It cannot touch an existing account, so this is not a way back in for someone who
   * has forgotten a password. See lib/auth/bootstrap.ts.
   */
  const bootstrap = await ensureAdminBootstrapped();
  if (bootstrap.status !== "created" && bootstrap.status !== "already-provisioned") {
    // Setup is incomplete: say so plainly. This describes the deployment, not an account,
    // so it reveals nothing about who does or does not have one.
    return { ok: false, message: bootstrap.message };
  }

  const user = await users().findOne({ email });
  // The same response whether or not the account exists, so this cannot enumerate users.
  const generic: FormState = { ok: false, message: "That email and password do not match." };
  if (!user || user.disabled) return generic;
  if (!(await verifyPassword(password, user.passwordHash))) return generic;

  await setSessionCookie({
    sub: user._id.toHexString(),
    email: user.email,
    role: user.role,
    ver: user.tokenVersion,
  });

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
