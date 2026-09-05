import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { logoutAction } from "@/lib/auth/actions";
import { getSiteSettings } from "@/lib/settings";
import { AdminNav } from "@/components/admin/admin-nav";

/**
 * The admin's own layout, deliberately plainer than the storefront: no serif display face
 * for chrome, no photography, denser rows. It is a working tool, not a shop window.
 *
 * requireAdmin() here is a convenience for the whole section, NOT the security boundary —
 * every page and every action re-checks for itself. A layout guard alone is not enough,
 * because a Server Action posts to the page endpoint without re-running this layout.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const site = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <a href="#admin-main" className="skip-link">
        Skip to main content
      </a>

      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-body text-h3 font-semibold text-ink">
            {site.shortName} <span className="text-ink-muted">admin</span>
          </Link>

          <div className="ml-auto flex items-center gap-4">
            <Link href="/" className="text-sm text-ink-muted hover:text-accent">
              View site
            </Link>
            <span className="hidden text-sm text-ink-muted sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-[var(--radius-md)] border px-3 py-1.5 text-sm hover:bg-surface-sunken"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>

      <main id="admin-main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
