import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { getEnquiry } from "@/lib/admin/queries";
import { EnquiryStatusForm } from "@/components/admin/enquiry-status-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Enquiry", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const enquiry = await getEnquiry(id);
  if (!enquiry) notFound();

  const mailto = `mailto:${encodeURIComponent(enquiry.email)}?subject=${encodeURIComponent(
    `Re: your enquiry ${enquiry.reference} — ${enquiry.gemTitle}`,
  )}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/enquiries" className="text-sm text-ink-muted hover:text-accent">
          ← All enquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-body text-h1 font-semibold">{enquiry.reference}</h1>
          <Badge tone={enquiry.status === "new" ? "accent" : "neutral"}>{enquiry.status}</Badge>
          {!enquiry.emailSent && <Badge tone="danger">Notification not delivered</Badge>}
        </div>
      </div>

      {!enquiry.emailSent && enquiry.emailError && (
        <div className="rounded-[var(--radius-md)] border border-danger bg-danger-wash p-4">
          <h2 className="text-h3 font-body text-ink">The notification email failed</h2>
          <p className="mt-1 text-sm text-ink">
            The enquiry itself was saved in full — nothing below is missing. The mail server
            reported: <span className="font-medium">{enquiry.emailError}</span>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-[var(--radius-md)] border bg-surface p-5">
            <h2 className="label-caps">Message</h2>
            <p className="mt-3 whitespace-pre-wrap text-body">{enquiry.message}</p>
          </section>

          <section className="rounded-[var(--radius-md)] border bg-surface p-5">
            <h2 className="label-caps">Working note</h2>
            <div className="mt-3">
              <EnquiryStatusForm
                enquiryId={enquiry._id.toHexString()}
                status={enquiry.status}
                adminNote={enquiry.adminNote}
              />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-[var(--radius-md)] border bg-surface p-5">
            <h2 className="label-caps">From</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-ink-muted">Name</dt>
                <dd>{enquiry.name}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Email</dt>
                <dd>
                  <a href={mailto} className="hover:text-accent">
                    {enquiry.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Phone</dt>
                <dd>{enquiry.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Received</dt>
                <dd>{enquiry.createdAt.toLocaleString(siteConfig.formatLocale)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Button asChild fullWidth>
                <a href={mailto}>Reply by email</a>
              </Button>
            </div>
          </section>

          <section className="rounded-[var(--radius-md)] border bg-surface p-5">
            <h2 className="label-caps">Stone</h2>
            <p className="mt-3 text-body">{enquiry.gemTitle}</p>
            <p className="text-sm text-ink-muted">{enquiry.gemReference}</p>
            {enquiry.gemSlug && (
              <p className="mt-3">
                <Link href={`/gem/${enquiry.gemSlug}`} className="text-sm hover:text-accent">
                  View on the site →
                </Link>
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
