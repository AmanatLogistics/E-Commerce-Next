import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BrowseView } from "@/components/gem/browse-view";
import { EmptyState } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { browseGems, getActiveCategories, getOrigins } from "@/lib/gems/queries";
import { GemGridSkeleton } from "@/components/gem/grid-skeleton";
import { parseBrowseParams, type BrowseParams, type RawSearchParams } from "@/lib/browse-params";

export const metadata: Metadata = {
  title: "All stones",
  description: "Every loose gemstone currently in the collection.",
};

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseBrowseParams(raw);

  /*
   * The Suspense boundary lives here rather than in a route-level loading.tsx: a loading
   * file streams the whole route, and a streamed response has already sent 200 by the time
   * a sibling route calls notFound(). Keyed on the query so changing a filter shows the
   * skeleton again instead of holding the previous results.
   */
  return (
    <Suspense
      key={JSON.stringify(raw)}
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-9 w-56 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="mt-8">
            <GemGridSkeleton />
          </div>
        </div>
      }
    >
      <CollectionResults params={params} />
    </Suspense>
  );
}

async function CollectionResults({ params }: { params: BrowseParams }) {
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
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-caps">The collection</p>
          <h1 className="text-h1 mt-2">
            {params.q ? <>Results for “{params.q}”</> : "All stones"}
          </h1>
          <p className="mt-3 text-ink-muted">
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
                ? "Try a shorter word — a variety like “emerald”, a locality like “Nuristan”, or a stock reference such as “AEC-EM-0101”."
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
                    className="block rounded-[var(--radius-md)] border bg-surface p-3 text-sm font-medium transition-colors hover:border-brand"
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
