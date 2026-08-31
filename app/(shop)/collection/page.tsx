import type { Metadata } from "next";
import Link from "next/link";
import { BrowseView } from "@/components/gem/browse-view";
import { EmptyState } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { browseGems, getActiveCategories, getOrigins } from "@/lib/gems/queries";
import { parseBrowseParams, type RawSearchParams } from "@/lib/browse-params";

export const metadata: Metadata = {
  title: "All stones",
  description: "Every loose gemstone currently in the collection.",
};

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parseBrowseParams(await searchParams);

  const [result, categories, origins] = await Promise.all([
    browseGems(params),
    getActiveCategories(),
    getOrigins(),
  ]);

  return (
    <BrowseView
      basePath="/collection"
      params={params}
      result={result}
      categories={categories}
      origins={origins}
      heading={
        <div className="max-w-2xl">
          <h1 className="text-h1">{params.q ? <>Results for “{params.q}”</> : "All stones"}</h1>
          <p className="mt-2 text-ink-muted">
            {params.q
              ? "Matching on stone name, reference, origin and colour."
              : "The full collection. Every listing states its treatment, and every stone can be enquired on."}
          </p>
        </div>
      }
      emptyState={
        <div className="flex flex-col gap-8">
          <EmptyState
            title={params.q ? `Nothing matches “${params.q}”` : "Nothing matches these filters"}
            body={
              params.q
                ? "Try a shorter word — a variety like “emerald”, a locality like “Hunza”, or a stock reference such as “KG-EM-0101”."
                : "No stone in the collection matches every filter you have applied. Removing the origin filter usually helps."
            }
          >
            <Button variant="secondary" size="sm" asChild>
              <Link href="/collection">Clear search and filters</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contact">Ask us to source it</Link>
            </Button>
          </EmptyState>

          <div>
            <h2 className="text-h3">Browse a variety instead</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/collection/${category.slug}`}
                    className="block rounded-[var(--radius-md)] border bg-surface p-3 text-sm font-medium transition-colors hover:border-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
    />
  );
}
