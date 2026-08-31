import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { getGemForEdit, listAllCategories } from "@/lib/admin/queries";
import { GemForm } from "@/components/admin/gem-form";
import { Button } from "@/components/ui/button";
import { deleteGemAction } from "@/lib/admin/actions";
import { toCategoryOption, toGemFormValues } from "@/lib/view-models";

export const metadata: Metadata = { title: "Edit stone", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditGemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [gem, categories] = await Promise.all([getGemForEdit(id), listAllCategories()]);
  if (!gem) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/gems" className="text-sm text-ink-muted hover:text-accent">
            ← All stones
          </Link>
          <h1 className="font-body text-h1 mt-2 font-semibold">{gem.title}</h1>
          <p className="text-sm text-ink-muted">{gem.reference}</p>
        </div>
        {gem.published && (
          <Button variant="secondary" asChild>
            <Link href={`/gem/${gem.slug}`}>View on the site</Link>
          </Button>
        )}
      </div>

      <GemForm categories={categories.map(toCategoryOption)} gem={toGemFormValues(gem)} />

      {gem.deletedAt === null && (
        <section className="rounded-[var(--radius-md)] border border-danger bg-surface p-5">
          <h2 className="text-h3 font-body">Delete this stone</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            The stone is removed from the site and unpublished, but the record is kept so past
            enquiries still make sense. You can restore it from the stones list.
          </p>
          <form action={deleteGemAction} className="mt-4">
            <input type="hidden" name="gemId" value={gem._id.toHexString()} />
            <Button type="submit" variant="danger">
              Delete stone
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
