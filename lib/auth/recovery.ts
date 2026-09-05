import "server-only";
import { DEFAULT_ADMIN_PASSWORD, env } from "../env";
import { users } from "../db/collections";
import { passwordSchema } from "../validation/schemas";
import { upsertAdmin } from "./admin-account";
import { hashPassword } from "./password";

/**
 * Getting back in, when the account exists but its password is not the one in the
 * environment.
 *
 * First-run provisioning (lib/auth/bootstrap.ts) deliberately never touches an existing
 * account, and that rule is right: it is the reason a forgotten password cannot be turned
 * into a way in. But it left a hole with no floor under it. Two ordinary mistakes put an
 * operator on the wrong side of it permanently:
 *
 *  - The account was created from one SEED_ADMIN_PASSWORD, and the variable was changed
 *    afterwards. Provisioning had already run, so the new value is never applied and the
 *    old one is unknowable.
 *  - The value was pasted into a hosting dashboard with a trailing space, a newline, or
 *    surrounding quotes. The account was created with those characters in the password, and
 *    nobody can type them back.
 *
 * Either way the answer used to be `npm run admin` — which needs a shell, which a hosted
 * deployment does not have. So the site was unrecoverable by its own owner.
 *
 * This is the floor: setting ADMIN_PASSWORD_RESET=true applies SEED_ADMIN_PASSWORD to the
 * SEED_ADMIN_EMAIL account, once, and says so plainly on the sign-in page.
 *
 * It is not a weakening of the rule above. Nothing a REQUEST carries reaches this — no form
 * field, no header, no query string. It is driven only by a server-side variable, settable
 * only by whoever administers the deployment, who already holds MONGODB_URI and could
 * rewrite the users collection by hand. It grants that person nothing they did not have; it
 * only saves them from having to.
 */

export type RecoveryStatus =
  | "not-requested"
  | "reset"
  | "moved"
  | "created"
  | "not-configured"
  | "default-password-refused"
  | "weak-password-refused";

export interface RecoveryResult {
  status: RecoveryStatus;
  /** Safe on the sign-in page: it describes configuration, never account state. */
  message: string;
}

const IDLE: RecoveryResult = { status: "not-requested", message: "" };

/**
 * Once per process. The variable stays set until the operator removes it, and re-hashing
 * the same password on every sign-in attempt would be pure waste — and would also mean a
 * password changed later in the admin panel got reverted on the next page load, which is
 * the opposite of helpful.
 */
let alreadyReset = false;

export async function applyAdminPasswordReset(): Promise<RecoveryResult> {
  if (!env.adminPasswordReset) return IDLE;
  if (alreadyReset) {
    return {
      status: "reset",
      message:
        "The administrator account was reset from ADMIN_PASSWORD_RESET to your current " +
        "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. Sign in with them, then remove that " +
        "variable from your hosting environment.",
    };
  }

  if (!env.adminCredentialsConfigured) {
    return {
      status: "not-configured",
      message:
        "ADMIN_PASSWORD_RESET is set, but SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are " +
        "not. There is nothing to reset the account to.",
    };
  }

  if (env.seedAdminPassword === DEFAULT_ADMIN_PASSWORD) {
    return {
      status: "default-password-refused",
      message:
        "SEED_ADMIN_PASSWORD is still the example password from the README, which is " +
        "public. Set a real one before resetting.",
    };
  }

  const password = passwordSchema.safeParse(env.seedAdminPassword);
  if (!password.success) {
    return {
      status: "weak-password-refused",
      message: `SEED_ADMIN_PASSWORD is not strong enough: ${password.error.issues[0]?.message}.`,
    };
  }

  const email = env.seedAdminEmail.trim().toLowerCase();
  const existing = await users().find({}, { sort: { createdAt: 1 } });
  const matching = existing.find((account) => account.email === email);

  /*
   * SEED_ADMIN_EMAIL can have changed too, not just the password — and then there is an
   * account nobody can name and a name with no account behind it. Upserting the configured
   * address would leave BOTH: a second administrator alongside an orphan that still opens
   * with a password nobody knows. Moving the single existing account is what the operator
   * actually means by "these are my credentials", and it ends with exactly one admin.
   */
  if (!matching && existing.length === 1) {
    const account = existing[0];
    await users().updateOne(
      { _id: account._id },
      {
        $set: {
          email,
          passwordHash: await hashPassword(password.data),
          disabled: false,
          updatedAt: new Date(),
        },
        // Every session issued to the old address ends here.
        $inc: { tokenVersion: 1 },
      },
    );
    alreadyReset = true;
    return {
      status: "moved",
      message:
        "The administrator account has been moved to your current SEED_ADMIN_EMAIL and " +
        "SEED_ADMIN_PASSWORD. Sign in with them, then remove ADMIN_PASSWORD_RESET from " +
        "your hosting environment.",
    };
  }

  // upsertAdmin bumps tokenVersion, so every session signed with the old password ends here.
  const result = await upsertAdmin(email, password.data);
  alreadyReset = true;

  return {
    status: result.created ? "created" : "reset",
    message: result.created
      ? "An administrator account was created for your current SEED_ADMIN_EMAIL and " +
        "SEED_ADMIN_PASSWORD. Sign in with them, then remove ADMIN_PASSWORD_RESET from " +
        "your hosting environment."
      : "The administrator password has been reset to your current SEED_ADMIN_PASSWORD. " +
        "Sign in with it, then remove ADMIN_PASSWORD_RESET from your hosting environment.",
  };
}

/**
 * Does the environment actually match the account it is supposed to open?
 *
 * Reported by /api/health, because "that email and password do not match" cannot tell you
 * WHICH of the two is wrong, and guessing costs a deploy each time.
 */
export interface CredentialDiagnosis {
  /** An account exists with the configured SEED_ADMIN_EMAIL. */
  emailMatches: boolean;
  /** SEED_ADMIN_PASSWORD opens it. Null when there is no such account to try it against. */
  passwordMatches: boolean | null;
  /**
   * The address the sole existing account actually has, masked. Only set when the
   * configured address matches nothing and there is exactly one account to point at.
   */
  existingAddressHint?: string;
}

export async function diagnoseConfiguredCredentials(): Promise<CredentialDiagnosis> {
  const email = env.seedAdminEmail.trim().toLowerCase();
  const account = await users().findOne({ email });

  if (!account) {
    const all = await users().find({});
    return {
      emailMatches: false,
      passwordMatches: null,
      existingAddressHint: all.length === 1 ? maskEmail(all[0].email) : undefined,
    };
  }

  const { verifyPassword } = await import("./password");
  return {
    emailMatches: true,
    passwordMatches: await verifyPassword(env.seedAdminPassword, account.passwordHash),
  };
}

/**
 * Enough of an address to recognise, not enough to sign in with.
 *
 * "Which address did I use?" is a real question with no other answer once the variable has
 * been changed — the operator cannot see their own database. But /api/health is public, and
 * an administrator's address is half of a credential, so the whole thing is not printable.
 * A couple of leading characters and the domain's shape is what makes someone say "oh, the
 * gmail one" without handing a stranger a username to attack.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";

  return `${local.slice(0, 2)}•••@${host.slice(0, 1)}•••${tld}`;
}

/**
 * The two ways a value arrives mangled from a hosting dashboard, which nobody spots by
 * looking at the field: invisible whitespace, and quotes that were meant as syntax.
 *
 * Reported as booleans. The value itself, and even its length, stay out of the response —
 * /api/health is public.
 */
export interface ValueHygiene {
  hasEdgeWhitespace: boolean;
  looksQuoted: boolean;
}

export function inspectValue(value: string): ValueHygiene {
  return {
    hasEdgeWhitespace: value !== value.trim(),
    looksQuoted: /^(['"])[^]*\1$/.test(value.trim()) && value.trim().length > 1,
  };
}

/** Tests need to observe a fresh process. */
export function resetRecoveryCacheForTests(): void {
  alreadyReset = false;
}
