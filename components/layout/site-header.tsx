import Link from "next/link";
import { Suspense } from "react";
import { siteConfig } from "@/lib/site-config";
import { getActiveCategories } from "@/lib/gems/queries";
import { SearchBox } from "./search-box";

/**
 * A restrained header: the shop is small enough that every gem variety fits on one rail,
 * so there is no mega-menu and no account area — buyers never sign in.
 */
export async function SiteHeader({ query = "" }: { query?: string }) {
  const cats = await getActiveCategories();

  return (
    <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <span className="font-display text-h2 font-semibold tracking-tight text-ink">
            {siteConfig.name}
          </span>
        </Link>

        {/*
          * SearchBox reads useSearchParams, which opts a route out of static prerendering
          * unless it sits behind a Suspense boundary. The fallback is a matching-height
          * placeholder so the header does not shift when the box hydrates.
          */}
        <div className="ml-auto hidden w-64 md:block">
          <Suspense fallback={<div className="h-9 rounded-[var(--radius-md)] border bg-surface" />}>
            <SearchBox initialQuery={query} />
          </Suspense>
        </div>

        <Link
          href="/contact"
          className="shrink-0 text-sm font-medium text-ink hover:text-accent"
        >
          Contact
        </Link>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <Suspense fallback={<div className="h-9 rounded-[var(--radius-md)] border bg-surface" />}>
          <SearchBox initialQuery={query} />
        </Suspense>
      </div>

      <nav aria-label="Gem varieties" className="border-t">
        <ul className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3">
          <li className="shrink-0">
            <Link
              href="/collection"
              className="inline-flex h-11 items-center px-2.5 text-sm font-medium text-ink hover:text-accent"
            >
              All stones
            </Link>
          </li>
          {cats.map((category) => (
            <li key={category.slug} className="shrink-0">
              <Link
                href={`/collection/${category.slug}`}
                className="inline-flex h-11 items-center px-2.5 text-sm text-ink-muted hover:text-accent"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
