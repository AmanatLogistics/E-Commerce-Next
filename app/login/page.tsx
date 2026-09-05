import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/layout/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureAdminBootstrapped } from "@/lib/auth/bootstrap";
import { applyAdminPasswordReset } from "@/lib/auth/recovery";
import { getSiteSettings } from "@/lib/settings";

/** The outcomes that mean the operator can now sign in, as opposed to a refusal. */
const RECOVERY_APPLIED = new Set(["reset", "moved", "created"]);

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Staff sign-in. There is no sign-up link because there are no customer accounts —
 * buyers enquire, they never register.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const site = await getSiteSettings();
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  // Already signed in? Skip the form.
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect(safeNext);

  /*
   * Surfaces first-run setup state on a fresh deployment: whether the administrator is
   * about to be created from the environment, or what is still missing. It describes the
   * deployment's configuration, never whether a particular account exists, and the state
   * ends the moment the first sign-in succeeds.
   */
  const setup = await ensureAdminBootstrapped();
  const needsSetup =
    setup.status !== "created" && setup.status !== "already-provisioned";

  /*
   * The escape hatch, when the account exists but its password is not the one configured.
   * Runs only from a server-side variable; nothing in this request influences it.
   */
  const recovery = await applyAdminPasswordReset();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="font-display text-h2 font-semibold text-ink">
        {site.name}
      </Link>
      <h1 className="text-h1 mt-6">Staff sign-in</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This is the private side of the site. Buyers do not need an account — enquiries are
        sent straight from a stone&rsquo;s page.
      </p>

      {needsSetup && (
        <div
          role="status"
          className="mt-6 rounded-[var(--radius-lg)] border border-gold bg-gold-wash p-4"
        >
          <h2 className="text-h3 text-ink">Setup is not finished</h2>
          <p className="mt-1 text-sm text-ink">{setup.message}</p>
        </div>
      )}

      {recovery.status !== "not-requested" && (
        <div
          role="status"
          className={
            RECOVERY_APPLIED.has(recovery.status)
              ? "mt-6 rounded-[var(--radius-lg)] border border-success bg-success-wash p-4"
              : "mt-6 rounded-[var(--radius-lg)] border border-gold bg-gold-wash p-4"
          }
        >
          <h2 className="text-h3 text-ink">
            {RECOVERY_APPLIED.has(recovery.status)
              ? "Administrator account reset"
              : "Password reset was refused"}
          </h2>
          <p className="mt-1 text-sm text-ink">{recovery.message}</p>
        </div>
      )}

      {setup.status === "created" && (
        <div
          role="status"
          className="mt-6 rounded-[var(--radius-lg)] border border-success bg-success-wash p-4"
        >
          <h2 className="text-h3 text-ink">Administrator account ready</h2>
          <p className="mt-1 text-sm text-ink">
            Created from your environment variables. Sign in with the email and password you
            configured.
          </p>
        </div>
      )}

      <div className="mt-8">
        <LoginForm next={safeNext} />
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand">
          ← Back to the collection
        </Link>
      </p>
    </main>
  );
}
