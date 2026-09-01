import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllCategories } from "@/lib/admin/queries";
import { GemForm } from "@/components/admin/gem-form";
import { toCategoryOption } from "@/lib/view-models";

export const metadata: Metadata = { title: "Add a stone", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewGemPage() {
  await requireAdmin();
  const categories = await listAllCategories();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/gems" className="text-sm text-ink-muted hover:text-accent">
          ← All stones
        </Link>
        <h1 className="font-body text-h1 mt-2 font-semibold">Add a stone</h1>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-accent bg-accent-wash p-4 text-sm">
          Add a gem variety first — a stone has to belong to one.{" "}
          <Link href="/admin/categories" className="font-medium underline">
            Manage varieties
          </Link>
        </p>
      ) : (
        <GemForm categories={categories.map(toCategoryOption)} />
      )}
    </div>
  );
}
