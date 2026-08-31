import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllCategories } from "@/lib/admin/queries";
import { getCategoryCounts } from "@/lib/gems/queries";
import { CategoryForm } from "@/components/admin/category-form";
import { toCategoryFormValues } from "@/lib/view-models";
import { deleteCategoryAction } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Varieties", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [categories, counts] = await Promise.all([listAllCategories(), getCategoryCounts()]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-body text-h1 font-semibold">Gem varieties</h1>

      <section className="rounded-[var(--radius-md)] border bg-surface p-5">
        <h2 className="text-h3 font-body">Add a variety</h2>
        <div className="mt-4">
          <CategoryForm />
        </div>
      </section>

      <section>
        <h2 className="label-caps">Existing varieties</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {categories.map((category) => (
            <li
              key={category._id.toHexString()}
              className="rounded-[var(--radius-md)] border bg-surface p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-h3 font-body">{category.name}</h3>
                <Badge tone={category.active ? "success" : "neutral"}>
                  {category.active ? "Active" : "Hidden"}
                </Badge>
                <span className="text-sm text-ink-muted">
                  {counts.get(category.slug) ?? 0} published
                </span>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium hover:text-accent">
                  Edit
                </summary>
                <div className="mt-4">
                  <CategoryForm category={toCategoryFormValues(category)} />
                </div>
              </details>

              <form action={deleteCategoryAction} className="mt-4 border-t pt-4">
                <input type="hidden" name="categoryId" value={category._id.toHexString()} />
                <Button type="submit" variant="secondary" size="sm">
                  {(counts.get(category.slug) ?? 0) > 0 ? "Hide variety" : "Delete variety"}
                </Button>
                <p className="mt-2 text-sm text-ink-muted">
                  {(counts.get(category.slug) ?? 0) > 0
                    ? "This variety still holds stones, so it is hidden rather than deleted — no stone is left without a variety."
                    : "Empty, so it will be removed outright."}
                </p>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
