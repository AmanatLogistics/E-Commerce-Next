"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "../db/collections";
import { mergeGuestCart } from "../cart/cart";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from "../validation/schemas";
import { hashPassword, verifyPassword } from "./password";
import { limits, rateLimit } from "./rate-limit";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "./session";
import { requireUserAction } from "./guards";

export interface FormState {
  ok: boolean;
  message: string;
  /** Field-level messages, keyed by field name, for inline display. */
  fieldErrors?: Record<string, string>;
  /** Set on password reset so the dev flow can surface the link without an email service. */
  devResetUrl?: string;
}

const EMPTY: FormState = { ok: false, message: "" };

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  // Only same-origin relative paths, so `?next=` cannot become an open redirect.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const gate = rateLimit(`signup:${await clientIp()}`, limits.signup.limit, limits.signup.windowMs);
  if (!gate.ok) {
    return { ok: false, message: "Too many sign-up attempts. Please try again later." };
  }

  const { name, email, password } = parsed.data;
  const existing = await users().findOne({ email });
  if (existing) {
    return { ok: false, message: "", fieldErrors: { email: "That email is already registered." } };
  }

  const now = new Date();
  const insert = await users().insertOne({
    email,
    name,
    passwordHash: await hashPassword(password),
    // Hardcoded. There is no code path anywhere that lets a request choose a role;
    // `role` is not a field in signupSchema, so a posted role is dropped before this line.
    role: "customer",
    tokenVersion: 0,
    disabled: false,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await setSessionCookie({ sub: insert.insertedId.toHexString(), email, role: "customer", ver: 0 });
  await mergeGuestCart(insert.insertedId);
  redirect(safeNext(formData.get("next")));
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

  const gate = rateLimit(`login:${await clientIp()}:${email}`, limits.login.limit, limits.login.windowMs);
  if (!gate.ok) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${Math.ceil(gate.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const user = await users().findOne({ email });
  // Identical response whether or not the account exists, so this cannot enumerate users.
  const generic = { ok: false, message: "That email and password do not match." } satisfies FormState;
  if (!user || user.disabled) return generic;
  if (!(await verifyPassword(password, user.passwordHash))) return generic;

  await setSessionCookie({
    sub: user._id.toHexString(),
    email: user.email,
    role: user.role,
    ver: user.tokenVersion,
  });
  await mergeGuestCart(user._id);

  const next = safeNext(formData.get("next"));
  redirect(next === "/" && user.role === "admin" ? "/admin" : next);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const { email } = parsed.data;

  const gate = rateLimit(`reset:${email}`, limits.passwordReset.limit, limits.passwordReset.windowMs);
  // The same confirmation is returned in every case, including when rate limited.
  const confirmation: FormState = {
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  };
  if (!gate.ok) return confirmation;

  const user = await users().findOne({ email });
  if (!user) return confirmation;

  const token = randomBytes(32).toString("hex");
  await users().updateOne(
    { _id: user._id },
    {
      $set: {
        // Only the hash is stored: a leaked database row cannot be replayed as a reset link.
        resetTokenHash: createHash("sha256").update(token).digest("hex"),
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60_000),
        updatedAt: new Date(),
      },
    },
  );

  const url = `/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  // No email provider is configured (see README limitations), so outside production the
  // link is returned to the caller instead of being silently dropped.
  return process.env.NODE_ENV === "production" ? confirmation : { ...confirmation, devResetUrl: url };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const { token, email, password } = parsed.data;

  const user = await users().findOne({ email });
  const hashed = createHash("sha256").update(token).digest("hex");
  if (
    !user ||
    !user.resetTokenHash ||
    user.resetTokenHash !== hashed ||
    !user.resetTokenExpiresAt ||
    user.resetTokenExpiresAt.getTime() < Date.now()
  ) {
    return { ok: false, message: "That reset link is invalid or has expired." };
  }

  await users().updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(password),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      },
      // Bumping the version signs out every existing session on this account.
      $inc: { tokenVersion: 1 },
    },
  );

  return { ok: true, message: "Password updated. You can sign in now." };
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUserAction();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, message: "", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  // Explicit field pick: nothing else from the form can reach the update.
  await users().updateOne(
    { _id: user._id },
    { $set: { name: parsed.data.name, updatedAt: new Date() } },
  );
  return { ok: true, message: "Profile updated." };
}

export async function getCurrentPublicUser() {
  const user = await getCurrentUser();
  return user ? { id: user._id.toHexString(), name: user.name, email: user.email, role: user.role } : null;
}

export { EMPTY as emptyFormState };
