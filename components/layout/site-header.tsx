import Link from "next/link";
import { Suspense } from "react";
import { getActiveCategories } from "@/lib/gems/queries";
import { readOptional } from "@/lib/db/build-safe";
import { NavLink } from "./nav-link";
import { SearchBox } from "./search-box";
import { AnnouncementBar } from "./announcement-bar";
import { Wordmark } from "./wordmark";

/**
 * A centred wordmark over a variety rail — the layout fine-jewellery storefronts use, and
 * the reason the brand reads before the navigation does. There is no account area: buyers
 * enquire and never sign in.
 */
export async function SiteHeader({ query = "" }: { query?: string }) {
  const cats = await readOptional("navigation categories", getActiveCategories, []);

  const searchFallback = (
    <div className="h-10 rounded-[var(--radius-md)] border border-line-strong bg-surface" />
  );

  return (
    <header className="sticky top-0 z-40 bg-surface-sunken/95 backdrop-blur">
      <AnnouncementBar />

      <div className="border-b">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-5">
          <div className="hidden md:block md:w-56">
            <Suspense fallback={searchFallback}>
              <SearchBox initialQuery={query} />
            </Suspense>
          </div>

          <Link href="/" className="col-start-2 justify-self-center">
            <Wordmark />
          </Link>

          <div className="col-start-3 justify-self-end">
            <Link
              href="/contact"
              className="label-caps !text-ink transition-colors hover:text-brand"
            >
              Contact
            </Link>
          </div>
        </div>

        <nav aria-label="Gem varieties" className="mx-auto max-w-7xl px-2 pb-1">
          <ul className="no-scrollbar flex justify-start gap-1 overflow-x-auto lg:justify-center">
            <li className="shrink-0">
              <NavLink
                href="/collection"
                className="label-caps inline-flex h-10 items-center px-3 !text-ink transition-colors hover:text-brand"
              >
                All stones
              </NavLink>
            </li>
            {cats.map((category) => (
              <li key={category.slug} className="shrink-0">
                <NavLink
                  href={`/collection/${category.slug}`}
                  className="label-caps inline-flex h-10 items-center px-3 transition-colors hover:text-brand"
                >
                  {category.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-b px-4 py-3 md:hidden">
        <Suspense fallback={searchFallback}>
          <SearchBox initialQuery={query} />
        </Suspense>
      </div>
    </header>
  );
}
