import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrowseView } from "@/components/gem/browse-view";
import { EmptyState } from "@/components/ui/empty";
import { GemGridSkeleton } from "@/components/gem/grid-skeleton";
import { Button } from "@/components/ui/button";
import { browseGems, getActiveCategories, getCategoryBySlug, getOrigins } from "@/lib/gems/queries";
import { parseBrowseParams, type RawSearchParams } from "@/lib/browse-params";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Not found" };
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/collection/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  // Resolved BEFORE anything streams: once a byte of a 200 has gone out, notFound() can no
  // longer change the status, and every unknown variety would answer 200.
  if (!category) notFound();

  const raw = await searchParams;

  /*
   * Changing a filter here used to hold the whole page — heading, filters and all — until
   * the new query came back, which reads as the page reloading rather than responding.
   * Streaming just the results keeps the page you are already looking at on screen, and the
   * key restarts the skeleton on every filter change instead of leaving the old results up
   * looking authoritative.
   */
  return (
    <Suspense key={JSON.stringify(raw)} fallback={<CategorySkeleton name={category.name} />}>
      <CategoryResults slug={slug} category={category} raw={raw} />
    </Suspense>
  );
}

function CategorySkeleton({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-h1">{name}</h1>
      </div>
      <div className="mt-8">
        <GemGridSkeleton />
      </div>
    </div>
  );
}

async function CategoryResults({
  slug,
  category,
  raw,
}: {
  slug: string;
  category: NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>;
  raw: RawSearchParams;
}) {
  const browseParams = parseBrowseParams(raw);
  const [result, categories, origins] = await Promise.all([
    browseGems(browseParams, slug),
    getActiveCategories(),
    getOrigins(),
  ]);

  return (
    <BrowseView
      basePath={`/collection/${slug}`}
      params={browseParams}
      result={result}
      categories={categories}
      origins={origins}
      lockedCategory
      heading={
        <div className="mx-auto max-w-2xl text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
            <Link href="/collection" className="hover:text-accent">
              All stones
            </Link>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span aria-current="page" className="text-ink">
              {category.name}
            </span>
          </nav>
          <h1 className="text-h1 mt-3">{category.name}</h1>
          <p className="mt-3 text-ink-muted">{category.description}</p>
        </div>
      }
      emptyState={
        <EmptyState
          title={`No ${category.name.toLowerCase()} matches these filters`}
          body="Nothing in this variety matches every filter you have applied. Stock changes regularly, and we can often source to a brief."
        >
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/collection/${slug}`}>Clear filters</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contact">Ask us to source it</Link>
          </Button>
        </EmptyState>
      }
    />
  );
}
