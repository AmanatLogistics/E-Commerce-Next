"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { users } from "../db/collections";
import { requireAdminAction } from "./guards";
import { verifyPassword } from "./password";
import { setSessionCookie } from "./session";
import {
  createAdminAccount,
  deleteAccount,
  enabledAccountCount,
  setAccountDisabled,
  setAccountPassword,
} from "./admin-account";
import { changeOwnPasswordSchema, newAccountSchema } from "../validation/schemas";
import { fieldErrorsFrom, type FormState } from "../forms/state";

/**
 * Staff accounts, managed from inside the admin panel.
 *
 * Until now the only account was the one the environment created, which meant adding a
 * colleague required a redeploy and changing your own password required a shell. Both are
 * ordinary things to want, and neither should cost a deployment.
 *
 * Every action calls requireAdminAction() as its FIRST statement. A Server Action is a POST
 * to the page's own endpoint and can be invoked with a crafted request, so the hidden UI and
 * the proxy check mean nothing here; requireAdminAction re-reads the session AND re-loads
 * the user from the database, so a stale cookie or an account suspended a minute ago fails.
 *
 * Two rails run through all of it:
 *
 *  1. Nothing here reads a role from the request. `role` is in no schema and is hard-coded
 *     where the account is written, so "create an account" can never mean "create a
 *     different kind of account".
 *  2. You cannot lock everyone out. The last account that can still sign in cannot be
 *     suspended or deleted, and you cannot suspend or delete yourself — the mistake that is
 *     one click away and has no undo without a redeploy.
 */

function objectIdFrom(formData: FormData, field: string): ObjectId | null {
  const raw = formData.get(field);
  if (typeof raw !== "string" || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

export async function createAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminAction();

  const parsed = newAccountSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { email, name, password } = parsed.data;
  const result = await createAdminAccount(email, name, password);
  if (!result.ok) {
    return { ok: false, message: "", fieldErrors: { email: result.message ?? "" } };
  }

  revalidatePath("/admin/accounts");
  return { ok: true, message: `Account created for ${email}. They can sign in now.` };
}

export async function changeOwnPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdminAction();

  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: "", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  if (!(await verifyPassword(parsed.data.currentPassword, me.passwordHash))) {
    return { ok: false, message: "", fieldErrors: { currentPassword: "That is not your current password." } };
  }

  await setAccountPassword(me._id, parsed.data.newPassword);

  /*
   * Setting a password bumps tokenVersion, which ends every session for that account —
   * including this one, mid-request. Every other device is meant to be signed out; this
   * browser is not, so it gets a cookie carrying the new version. Without this, changing
   * your own password logs you straight out, which reads as a failure.
   */
  const fresh = await users().findOne({ _id: me._id });
  if (fresh) {
    await setSessionCookie({
      sub: fresh._id.toHexString(),
      email: fresh.email,
      role: fresh.role,
      ver: fresh.tokenVersion,
    });
  }

  revalidatePath("/admin/accounts");
  return {
    ok: true,
    message: "Your password has been changed. Any other device you were signed in on has been signed out.",
  };
}

export async function resetAccountPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminAction();

  const id = objectIdFrom(formData, "accountId");
  if (!id) return { ok: false, message: "That account no longer exists." };

  const password = newAccountSchema.shape.password.safeParse(formData.get("password"));
  if (!password.success) {
    return {
      ok: false,
      message: "",
      fieldErrors: { password: password.error.issues[0]?.message ?? "" },
    };
  }

  const account = await users().findOne({ _id: id });
  if (!account) return { ok: false, message: "That account no longer exists." };

  await setAccountPassword(id, password.data);
  revalidatePath("/admin/accounts");
  return {
    ok: true,
    message: `Password changed for ${account.email}. They have been signed out everywhere.`,
  };
}

export async function setAccountDisabledAction(formData: FormData): Promise<void> {
  const me = await requireAdminAction();

  const id = objectIdFrom(formData, "accountId");
  if (!id) return;
  const disabled = formData.get("disabled") === "true";

  // Suspending yourself is a one-click lockout with no undo from inside the app.
  if (disabled && id.equals(me._id)) return;
  // Nor the last account that can still sign in.
  if (disabled && (await enabledAccountCount()) <= 1) return;

  await setAccountDisabled(id, disabled);
  revalidatePath("/admin/accounts");
}

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const me = await requireAdminAction();

  const id = objectIdFrom(formData, "accountId");
  if (!id) return;
  if (id.equals(me._id)) return;

  const account = await users().findOne({ _id: id });
  if (!account) return;
  // Deleting the last account that can sign in would leave the site unrecoverable without
  // a redeploy, which is exactly the hole this screen exists to close.
  if (!account.disabled && (await enabledAccountCount()) <= 1) return;

  await deleteAccount(id);
  revalidatePath("/admin/accounts");
}
