import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { listEnquiries } from "@/lib/admin/queries";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/cn";
import type { EnquiryStatus } from "@/lib/db/documents";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Enquiries", robots: { index: false } };
export const dynamic = "force-dynamic";

const FILTERS: { value: EnquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const raw = await searchParams;

  const status = (FILTERS.find((f) => f.value === raw.status)?.value ?? "all") as
    | EnquiryStatus
    | "all";
  const page = Math.max(1, Number.parseInt(raw.page ?? "1", 10) || 1);

  const { rows, total, totalPages, counts } = await listEnquiries({ status, page });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-body text-h1 font-semibold">Enquiries</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/admin/enquiries" : `/admin/enquiries?status=${filter.value}`}
            aria-current={status === filter.value ? "page" : undefined}
            className={cn(
              "rounded-[var(--radius-md)] border px-3 py-1.5 text-sm",
              status === filter.value
                ? "border-accent bg-accent text-accent-ink"
                : "bg-surface hover:bg-surface-sunken",
            )}
          >
            {filter.label} ({counts[filter.value]})
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed bg-surface p-8 text-center text-sm text-ink-muted">
          No enquiries {status === "all" ? "yet" : `with status “${status}”`}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border bg-surface">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <caption className="sr-only">
                {total} enquiries, newest first
              </caption>
              <thead className="border-b">
                <tr>
                  <th scope="col" className="label-caps p-3">Reference</th>
                  <th scope="col" className="label-caps p-3">From</th>
                  <th scope="col" className="label-caps p-3">Stone</th>
                  <th scope="col" className="label-caps p-3">Status</th>
                  <th scope="col" className="label-caps p-3">Email</th>
                  <th scope="col" className="label-caps p-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((enquiry) => (
                  <tr key={enquiry._id.toHexString()} className="border-b last:border-0 hover:bg-surface-sunken">
                    <td className="p-3">
                      <Link
                        href={`/admin/enquiries/${enquiry._id.toHexString()}`}
                        className="font-medium hover:text-accent"
                      >
                        {enquiry.reference}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className="block">{enquiry.name}</span>
                      <span className="block text-ink-muted">{enquiry.email}</span>
                    </td>
                    <td className="p-3 text-ink-muted">{enquiry.gemReference}</td>
                    <td className="p-3">
                      <Badge tone={enquiry.status === "new" ? "accent" : "neutral"}>
                        {enquiry.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {enquiry.emailSent ? (
                        <span className="text-ink-muted">Sent</span>
                      ) : (
                        <Badge tone="danger">Not delivered</Badge>
                      )}
                    </td>
                    <td className="p-3 text-ink-muted">
                      {enquiry.createdAt.toLocaleString(siteConfig.formatLocale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) =>
              status === "all"
                ? `/admin/enquiries?page=${p}`
                : `/admin/enquiries?status=${status}&page=${p}`
            }
          />
        </>
      )}
    </div>
  );
}
