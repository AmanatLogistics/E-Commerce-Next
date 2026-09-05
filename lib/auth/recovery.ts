import "server-only";
import { DEFAULT_ADMIN_PASSWORD, env } from "../env";
import { users } from "../db/collections";
import { passwordSchema } from "../validation/schemas";
import { upsertAdmin } from "./admin-account";

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
        "The administrator password was reset from ADMIN_PASSWORD_RESET. Remove that " +
        "variable from your hosting environment now that you are back in.",
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

  // upsertAdmin bumps tokenVersion, so every session signed with the old password ends here.
  await upsertAdmin(env.seedAdminEmail, password.data);
  alreadyReset = true;

  return {
    status: "reset",
    message:
      "The administrator password has been reset to your current SEED_ADMIN_PASSWORD. " +
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
}

export async function diagnoseConfiguredCredentials(): Promise<CredentialDiagnosis> {
  const email = env.seedAdminEmail.trim().toLowerCase();
  const account = await users().findOne({ email });
  if (!account) return { emailMatches: false, passwordMatches: null };

  const { verifyPassword } = await import("./password");
  return {
    emailMatches: true,
    passwordMatches: await verifyPassword(env.seedAdminPassword, account.passwordHash),
  };
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
