import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { readSettingsForEditing } from "@/lib/settings";
import { siteConfig } from "@/lib/site-config";
import { resetSettingsAction } from "@/lib/admin/settings-actions";
import { SettingsForm } from "@/components/admin/settings-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Site details", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * The site's identity, editable without a deploy.
 *
 * requireAdmin() here is this page's own guard, not the layout's — and the actions it posts
 * to guard themselves again, because a Server Action re-runs neither.
 */
export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");
  const settings = await readSettingsForEditing();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-body text-h1 font-semibold">Site details</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          The name, contact details and copy the whole site is built from. Saving updates
          every page, including the ones served from cache.
        </p>
      </div>

      <section className="rounded-[var(--radius-md)] border bg-surface p-5">
        <SettingsForm settings={settings} />
      </section>

      <section className="rounded-[var(--radius-md)] border bg-surface p-5">
        <h2 className="text-h3 font-body">Set in code, not here</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          These are not editable on purpose. Each one is depended on somewhere that a text
          box cannot safely reach into.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="label-caps">Currency</dt>
            <dd className="mt-1 text-ink-muted">
              {siteConfig.currency} — every stored price is an integer in its minor unit, so
              changing it re-reads existing prices rather than converting them.
            </dd>
          </div>
          <div>
            <dt className="label-caps">Stock reference prefix</dt>
            <dd className="mt-1 text-ink-muted">
              {siteConfig.enquiryPrefix} — already printed on references buyers are quoting
              back to you. Changing it would orphan them.
            </dd>
          </div>
          <div>
            <dt className="label-caps">Web address</dt>
            <dd className="mt-1 break-all text-ink-muted">{siteConfig.url}</dd>
          </div>
          <div>
            <dt className="label-caps">Language</dt>
            <dd className="mt-1 text-ink-muted">{siteConfig.locale}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[var(--radius-md)] border bg-surface p-5">
        <h2 className="text-h3 font-body">Start again</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Removes everything saved here and goes back to the values shipped with the site.
          Nothing else is touched — your stones and enquiries are not involved.
        </p>
        <form action={resetSettingsAction} className="mt-4">
          <Button type="submit" variant="secondary" size="sm">
            Restore the original details
          </Button>
        </form>
      </section>
    </div>
  );
}
