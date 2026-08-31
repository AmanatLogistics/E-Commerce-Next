import Link from "next/link";
import { GemGrid } from "@/components/gem/gem-card";
import { Button } from "@/components/ui/button";
import { getActiveCategories, getCategoryCounts, getFeaturedGems, getLatestGems } from "@/lib/gems/queries";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, latest, cats, counts] = await Promise.all([
    getFeaturedGems(8),
    getLatestGems(8),
    getActiveCategories(),
    getCategoryCounts(),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10">
      {/* A short, plain statement rather than a banner — the stones are the hero. */}
      <section className="max-w-2xl">
        <h1 className="text-display">{siteConfig.tagline}</h1>
        <p className="mt-4 text-body text-ink-muted">
          Every stone here was selected individually and is photographed as it is. Treatments
          are disclosed on every listing, and nothing is sold through a shopping basket —
          tell us which stone interests you and we will reply personally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/collection">Browse all stones</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/contact">Ask for something specific</Link>
          </Button>
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
            <h2 id="featured-heading" className="text-h2">
              Selected stones
            </h2>
            <Link href="/collection" className="text-sm font-medium text-ink hover:text-accent">
              See all {counts.size > 0 ? [...counts.values()].reduce((a, b) => a + b, 0) : ""} stones
            </Link>
          </div>
          <div className="mt-6">
            <GemGrid gems={featured} priorityCount={4} />
          </div>
        </section>
      )}

      <section aria-labelledby="varieties-heading">
        <h2 id="varieties-heading" className="text-h2 border-b pb-3">
          By variety
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/collection/${category.slug}`}
                className="flex h-full flex-col gap-2 rounded-[var(--radius-md)] border bg-surface p-5 transition-colors hover:border-accent"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-h3 font-semibold text-ink">
                    {category.name}
                  </span>
                  <span className="label-caps">
                    {counts.get(category.slug) ?? 0} in stock
                  </span>
                </div>
                <span className="text-sm text-ink-muted">{category.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading" className="text-h2 border-b pb-3">
          Recently added
        </h2>
        <div className="mt-6">
          <GemGrid gems={latest} />
        </div>
      </section>
    </div>
  );
}
