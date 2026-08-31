import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { getActiveCategories } from "@/lib/gems/queries";

export async function SiteFooter() {
  const cats = await getActiveCategories();

  return (
    <footer className="mt-16 border-t bg-surface-sunken">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-display text-h3 font-semibold text-ink">{siteConfig.name}</p>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">{siteConfig.description}</p>
        </div>

        <nav aria-label="Gem varieties">
          <h2 className="label-caps">Stones</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {cats.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/collection/${category.slug}`}
                  className="text-sm text-ink-muted hover:text-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="label-caps">Get in touch</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
            <li>
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-accent">
                {siteConfig.contactEmail}
              </a>
            </li>
            <li>{siteConfig.contactPhone}</li>
            <li>{siteConfig.address}</li>
            <li>
              <Link href="/contact" className="hover:text-accent">
                Send a general enquiry
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t px-4 py-5">
        <p className="mx-auto max-w-6xl text-sm text-ink-muted">
          © {new Date().getFullYear()} {siteConfig.name}. Every stone is sold by enquiry —
          nothing is charged through this website. Treatments are disclosed on every listing.
        </p>
      </div>
    </footer>
  );
}
