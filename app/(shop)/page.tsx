import { GemPhoto } from "@/components/gem/gem-photo";
import Link from "next/link";
import { GemGrid } from "@/components/gem/gem-card";
import { Button } from "@/components/ui/button";
import {
  getActiveCategories,
  getCategoryCounts,
  getFeaturedGems,
  getLatestGems,
} from "@/lib/gems/queries";
import { getSiteSettings } from "@/lib/settings";
import { readDuringBuild } from "@/lib/db/build-safe";

export const revalidate = 300;

export default async function HomePage() {
  const site = await getSiteSettings();
  type HomeData = [
    Awaited<ReturnType<typeof getFeaturedGems>>,
    Awaited<ReturnType<typeof getLatestGems>>,
    Awaited<ReturnType<typeof getActiveCategories>>,
    Awaited<ReturnType<typeof getCategoryCounts>>,
  ];

  const [featured, latest, cats, counts] = await readDuringBuild<HomeData>(
    "home page catalogue",
    () =>
      Promise.all([
        getFeaturedGems(8),
        getLatestGems(4),
        getActiveCategories(),
        getCategoryCounts(),
      ]),
    [[], [], [], new Map()],
  );

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const hero = featured[0];

  return (
    <div className="flex flex-col">
      {/* Hero: the stone carries it, with the type set against a wide margin. */}
      <section className="border-b bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div className="order-2 lg:order-1">
            <p className="label-caps">Panjshir Valley · Since 1998</p>
            <h1 className="text-display mt-4">{site.tagline}</h1>
            <p className="mt-6 max-w-md text-ink-muted">
              Every stone is selected by hand at the mine head and photographed exactly as it
              is. Treatments are disclosed on every listing, including when there are none.
              Nothing is sold through a basket — tell us which stone interests you and we
              will reply personally.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/collection">Explore the collection</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/contact">Commission a search</Link>
              </Button>
            </div>
          </div>

          {hero && (
            <Link
              href={`/gem/${hero.slug}`}
              className="group order-1 block lg:order-2"
              aria-label={`${hero.title} — view this stone`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-plate">
                <GemPhoto
                  src={hero.image}
                  alt={hero.imageAlt}
                  width={900}
                  height={675}
                  priority
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-h3">{hero.title}</p>
                <p className="label-caps">{hero.reference}</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Varieties */}
      <section aria-labelledby="varieties" className="mx-auto w-full max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 id="varieties" className="text-h2 crest-rule crest-rule-center">
            Shop by variety
          </h2>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 lg:gap-4">
          {cats.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/collection/${category.slug}`}
                className="flex h-full flex-col items-center gap-1 rounded-[var(--radius-lg)] border bg-surface px-3 py-6 text-center transition-colors hover:border-brand hover:bg-brand-wash"
              >
                <span className="font-display text-h3 text-ink">{category.name}</span>
                <span className="label-caps">{counts.get(category.slug) ?? 0} stones</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section aria-labelledby="featured" className="bg-surface py-16">
          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="text-center">
              <p className="label-caps">Hand selected</p>
              <h2 id="featured" className="text-h2 mt-2 crest-rule crest-rule-center">
                The collection
              </h2>
            </div>
            <div className="mt-10">
              <GemGrid gems={featured} priorityCount={4} />
            </div>
            <div className="mt-12 text-center">
              <Button variant="secondary" asChild>
                <Link href="/collection">View all {total} stones</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Recently added */}
      <section aria-labelledby="latest" className="mx-auto w-full max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 id="latest" className="text-h2 crest-rule crest-rule-center">
            Recently added
          </h2>
        </div>
        <div className="mt-10">
          <GemGrid gems={latest} />
        </div>
      </section>
    </div>
  );
}
