import "server-only";
import { ObjectId } from "mongodb";
import { users } from "../db/collections";
import { hashPassword } from "./password";
import type { UserDoc } from "../db/documents";

/**
 * Every way an account comes into existence, or stops existing.
 *
 * Shared by `npm run seed`, `npm run admin`, first-run provisioning, recovery, and the
 * accounts screen in the admin panel, so none of them can drift: there must be exactly one
 * place this happens, and this is it.
 *
 * The admin screen means a REQUEST can now create an account, which it could not before, so
 * the invariant that keeps that safe is stated here rather than left implicit: `role` is
 * hard-coded to "admin" in every function below and appears in no schema, so no form field,
 * header or query string can influence it. Callers reached from a request must call
 * requireAdminAction() first — the guard is the boundary; this module does not check
 * permission for them.
 */

export interface AdminUpsertResult {
  created: boolean;
  email: string;
}

/**
 * Creates the admin, or updates the existing one's password and name in place.
 *
 * Updating in place matters: the alternative is re-running the seed, which clears the
 * collections and would throw away every enquiry the dealer has received. Changing a
 * password must never cost you your leads.
 */
export async function upsertAdmin(
  emailInput: string,
  password: string,
  name = "Store Admin",
): Promise<AdminUpsertResult> {
  const email = emailInput.trim().toLowerCase();
  const now = new Date();
  const passwordHash = await hashPassword(password);

  const existing = await users().findOne({ email });

  if (existing) {
    await users().updateOne(
      { _id: existing._id },
      {
        $set: { passwordHash, name, role: "admin", disabled: false, updatedAt: now },
        // Bumping the version signs out every session that used the old password.
        $inc: { tokenVersion: 1 },
      },
    );
    return { created: false, email };
  }

  await users().insertOne({
    email,
    name,
    passwordHash,
    role: "admin",
    tokenVersion: 0,
    disabled: false,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return { created: true, email };
}

export async function listAdmins(): Promise<UserDoc[]> {
  return users().find({}, { sort: { createdAt: 1 } });
}

export interface CreateAccountResult {
  ok: boolean;
  /** Set when the address is already taken, which is a message the form should show. */
  message?: string;
  id?: string;
}

/**
 * Creates a new colleague's account.
 *
 * Deliberately NOT upsertAdmin. That updates in place when the address matches, which is
 * right for a seed script re-run and completely wrong for a create form: typing an address
 * that already exists would silently overwrite that person's password and sign them out,
 * with the screen reporting success. Refusing is the only safe answer.
 *
 * The unique index on users.email is the real guarantee; this check exists to turn the race
 * that index catches into a sentence someone can read.
 */
export async function createAdminAccount(
  emailInput: string,
  name: string,
  password: string,
): Promise<CreateAccountResult> {
  const email = emailInput.trim().toLowerCase();
  if (await users().findOne({ email })) {
    return { ok: false, message: "An account with that email address already exists." };
  }

  const now = new Date();
  try {
    const { insertedId } = await users().insertOne({
      email,
      name: name.trim(),
      passwordHash: await hashPassword(password),
      role: "admin",
      tokenVersion: 0,
      disabled: false,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, id: insertedId.toString() };
  } catch (error) {
    // The unique index, catching two people creating the same address at once.
    if ((error as { code?: number }).code === 11000) {
      return { ok: false, message: "An account with that email address already exists." };
    }
    throw error;
  }
}

/**
 * Sets an account's password. Bumping tokenVersion ends every session that account has open
 * — which is the point when an administrator is resetting someone else's, and something the
 * caller must compensate for when it is your own (see changeOwnPasswordAction).
 */
export async function setAccountPassword(id: ObjectId, password: string): Promise<void> {
  await users().updateOne(
    { _id: id },
    {
      $set: { passwordHash: await hashPassword(password), updatedAt: new Date() },
      $inc: { tokenVersion: 1 },
    },
  );
}

/** Suspends or restores an account. A suspended account fails getCurrentUser immediately. */
export async function setAccountDisabled(id: ObjectId, disabled: boolean): Promise<void> {
  await users().updateOne(
    { _id: id },
    {
      $set: { disabled, updatedAt: new Date() },
      // Suspending has to end the sessions already open, or it means nothing until expiry.
      ...(disabled ? { $inc: { tokenVersion: 1 } } : {}),
    },
  );
}

export async function deleteAccount(id: ObjectId): Promise<void> {
  await users().deleteOne({ _id: id });
}

/** How many accounts can still sign in. Guards against removing the last way in. */
export async function enabledAccountCount(): Promise<number> {
  return users().countDocuments({ disabled: false });
}
