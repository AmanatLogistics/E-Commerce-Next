import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { getDashboardStats } from "@/lib/admin/queries";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isSmtpConfigured } from "@/lib/email/mailer";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <CardBody>
      <p className="label-caps">{label}</p>
      <p className="mt-1 font-body text-h1 font-semibold text-ink">{value}</p>
    </CardBody>
  );
  return <Card className="bg-surface">{href ? <Link href={href}>{body}</Link> : body}</Card>;
}

export default async function AdminDashboard() {
  // Re-checked here, independently of the layout.
  await requireAdmin();
  const stats = await getDashboardStats();
  const smtp = isSmtpConfigured();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-body text-h1 font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/admin/gems/new">Add a stone</Link>
        </Button>
      </div>

      {!smtp && (
        <div className="rounded-[var(--radius-md)] border border-accent bg-accent-wash p-4">
          <h2 className="text-h3 font-body text-ink">Email is not configured</h2>
          <p className="mt-1 text-sm text-ink">
            SMTP_HOST, ENQUIRY_RECIPIENT and MAIL_FROM are not all set, so enquiry
            notifications are being written to the local outbox instead of sent. Enquiries
            themselves are still recorded in full and appear below — nothing is being lost.
          </p>
        </div>
      )}

      {stats.undeliveredEmails > 0 && (
        <div className="rounded-[var(--radius-md)] border border-danger bg-danger-wash p-4">
          <h2 className="text-h3 font-body text-ink">
            {stats.undeliveredEmails} notification
            {stats.undeliveredEmails === 1 ? "" : "s"} could not be delivered
          </h2>
          <p className="mt-1 text-sm text-ink">
            The enquiries were saved. Open them to see the delivery error and reply directly.
          </p>
        </div>
      )}

      <section aria-labelledby="enquiry-stats">
        <h2 id="enquiry-stats" className="label-caps">
          Enquiries
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="New" value={stats.newEnquiries} href="/admin/enquiries?status=new" />
          <Stat label="All time" value={stats.totalEnquiries} href="/admin/enquiries" />
        </div>
      </section>

      <section aria-labelledby="stock-stats">
        <h2 id="stock-stats" className="label-caps">
          Stock
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Stones" value={stats.totalGems} href="/admin/gems" />
          <Stat label="Published" value={stats.published} />
          <Stat label="Drafts" value={stats.drafts} />
          <Stat label="Available" value={stats.available} />
          <Stat label="Reserved" value={stats.reserved} />
          <Stat label="Sold" value={stats.sold} />
        </div>
      </section>

      <section aria-labelledby="recent">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="label-caps">
            Latest enquiries
          </h2>
          <Link href="/admin/enquiries" className="text-sm text-ink-muted hover:text-accent">
            See all
          </Link>
        </div>

        {stats.recentEnquiries.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-md)] border border-dashed bg-surface p-6 text-center text-sm text-ink-muted">
            No enquiries yet. They will appear here the moment one arrives.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-md)] border bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b">
                <tr>
                  <th scope="col" className="label-caps p-3">Reference</th>
                  <th scope="col" className="label-caps p-3">From</th>
                  <th scope="col" className="label-caps p-3">Stone</th>
                  <th scope="col" className="label-caps p-3">Status</th>
                  <th scope="col" className="label-caps p-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEnquiries.map((enquiry) => (
                  <tr key={enquiry._id.toHexString()} className="border-b last:border-0">
                    <td className="p-3">
                      <Link
                        href={`/admin/enquiries/${enquiry._id.toHexString()}`}
                        className="font-medium hover:text-accent"
                      >
                        {enquiry.reference}
                      </Link>
                    </td>
                    <td className="p-3">{enquiry.name}</td>
                    <td className="p-3 text-ink-muted">{enquiry.gemReference}</td>
                    <td className="p-3">
                      <Badge tone={enquiry.status === "new" ? "accent" : "neutral"}>
                        {enquiry.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-ink-muted">
                      {enquiry.createdAt.toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
