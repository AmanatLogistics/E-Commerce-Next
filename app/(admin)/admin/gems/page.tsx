import type { Metadata } from "next";
import { GemPhoto } from "@/components/gem/gem-photo";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { listGems } from "@/lib/admin/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { GemPrice } from "@/components/gem/price";
import { restoreGemAction } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Stones", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminGemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; deleted?: string; created?: string }>;
}) {
  await requireAdmin();
  const raw = await searchParams;

  const q = (raw.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(raw.page ?? "1", 10) || 1);
  const includeDeleted = raw.deleted === "all";

  const { rows, total, totalPages } = await listGems({ q, page, includeDeleted });

  const href = (p: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (includeDeleted) search.set("deleted", "all");
    if (p > 1) search.set("page", String(p));
    const query = search.toString();
    return query ? `/admin/gems?${query}` : "/admin/gems";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-body text-h1 font-semibold">Stones</h1>
        <Button asChild>
          <Link href="/admin/gems/new">Add a stone</Link>
        </Button>
      </div>

      {raw.created === "1" && (
        <p role="status" className="rounded-[var(--radius-md)] border border-success bg-success-wash p-3 text-sm">
          Stone added.
        </p>
      )}
      {raw.deleted === "1" && (
        <p role="status" className="rounded-[var(--radius-md)] border bg-surface p-3 text-sm">
          Stone deleted. It is hidden from the site but kept for your records.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <form action="/admin/gems" method="get" className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-gem-search" className="label-caps">
              Search
            </label>
            <input
              id="admin-gem-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Title, reference or slug"
              className="h-9 w-56 rounded-[var(--radius-md)] border bg-surface px-3 text-sm hover:border-ink-muted focus:border-accent"
            />
          </div>
          {includeDeleted && <input type="hidden" name="deleted" value="all" />}
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <Link
          href={includeDeleted ? (q ? `/admin/gems?q=${encodeURIComponent(q)}` : "/admin/gems") : href(1).includes("?") ? `${href(1)}&deleted=all` : "/admin/gems?deleted=all"}
          className="pb-1.5 text-sm text-ink-muted hover:text-accent"
        >
          {includeDeleted ? "Hide deleted" : "Show deleted"}
        </Link>

        <p className="ml-auto pb-1.5 text-sm text-ink-muted">{total} stones</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed bg-surface p-8 text-center text-sm text-ink-muted">
          {q ? `Nothing matches “${q}”.` : "No stones yet. Add the first one."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border bg-surface">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b">
                <tr>
                  <th scope="col" className="label-caps p-3">Stone</th>
                  <th scope="col" className="label-caps p-3">Variety</th>
                  <th scope="col" className="label-caps p-3">Carat</th>
                  <th scope="col" className="label-caps p-3">Price</th>
                  <th scope="col" className="label-caps p-3">Status</th>
                  <th scope="col" className="label-caps p-3">Visibility</th>
                  <th scope="col" className="label-caps p-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((gem) => (
                  <tr key={gem.id} className="border-b last:border-0 hover:bg-surface-sunken">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {gem.image && (
                          <GemPhoto
                            src={gem.image}
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 shrink-0 rounded-[var(--radius-sm)] bg-plate object-cover"
                          />
                        )}
                        <div>
                          <Link
                            href={`/admin/gems/${gem.id}`}
                            className="font-medium hover:text-accent"
                          >
                            {gem.title}
                          </Link>
                          <span className="block text-ink-muted">{gem.reference}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-ink-muted">{gem.categorySlug}</td>
                    <td className="p-3">{gem.caratWeight.toFixed(2)}</td>
                    <td className="p-3">
                      <GemPrice priceMinor={gem.priceMinor} size="sm" />
                    </td>
                    <td className="p-3">
                      <Badge tone={gem.status === "available" ? "success" : "neutral"}>
                        {gem.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {gem.deleted ? (
                          <Badge tone="danger">Deleted</Badge>
                        ) : gem.published ? (
                          <Badge tone="neutral">Published</Badge>
                        ) : (
                          <Badge tone="accent">Draft</Badge>
                        )}
                        {gem.featured && <Badge tone="neutral">Featured</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {gem.deleted ? (
                        <form action={restoreGemAction}>
                          <input type="hidden" name="gemId" value={gem.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Restore
                          </Button>
                        </form>
                      ) : (
                        <Link
                          href={`/admin/gems/${gem.id}`}
                          className="text-sm font-medium hover:text-accent"
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} buildHref={href} />
        </>
      )}
    </div>
  );
}
