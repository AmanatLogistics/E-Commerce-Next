import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/layout/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";

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
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  // Already signed in? Skip the form.
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect(safeNext);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="font-display text-h2 font-semibold text-ink">
        {siteConfig.name}
      </Link>
      <h1 className="text-h1 mt-6">Staff sign-in</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This is the private side of the site. Buyers do not need an account — enquiries are
        sent straight from a stone&rsquo;s page.
      </p>

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
