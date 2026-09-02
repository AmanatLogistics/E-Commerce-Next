import "server-only";
import { users } from "../db/collections";
import { hashPassword } from "./password";
import type { UserDoc } from "../db/documents";

/**
 * Creating and updating the one admin account.
 *
 * Shared by `npm run seed` and `npm run admin` so the two cannot drift: there must be
 * exactly one way an account comes into existence, and this is it. Nothing in the
 * application imports this — there is still no request path that can create or promote an
 * account.
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
