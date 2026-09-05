import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { getActiveCategories } from "@/lib/gems/queries";
import { readOptional } from "@/lib/db/build-safe";
import { Crest } from "./wordmark";

export async function SiteFooter() {
  const cats = await readOptional("footer categories", getActiveCategories, []);

  return (
    <footer className="bg-brand text-brand-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Crest className="text-gold" />
          <p className="mt-3 font-display text-[1.35rem] leading-none tracking-[0.14em]">
            {siteConfig.name.toUpperCase()}
          </p>
          <p className="mt-4 max-w-xs text-sm opacity-80">{siteConfig.description}</p>
        </div>

        <nav aria-label="Gem varieties">
          <h2 className="label-caps !text-brand-ink opacity-70">Stones</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {cats.map((category) => (
              <li key={category.slug}>
                <Link href={`/collection/${category.slug}`} className="text-sm opacity-85 hover:opacity-100 hover:underline">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="label-caps !text-brand-ink opacity-70">Buying with us</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm opacity-85">
            {siteConfig.promises.map((promise) => (
              <li key={promise.title}>{promise.title}</li>
            ))}
            <li>
              <Link href="/collection" className="hover:underline">
                Browse the collection
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="label-caps !text-brand-ink opacity-70">Get in touch</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm opacity-85">
            <li>
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:underline">
                {siteConfig.contactEmail}
              </a>
            </li>
            <li>{siteConfig.contactPhone}</li>
            <li>{siteConfig.address}</li>
            <li>
              <Link href="/contact" className="hover:underline">
                Send an enquiry
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15 px-4 py-5">
        <p className="mx-auto max-w-7xl text-xs opacity-70">
          © {new Date().getFullYear()} {siteConfig.name}. Every stone is sold by enquiry —
          nothing is charged through this website. Treatments are disclosed on every listing.
        </p>
      </div>
    </footer>
  );
}
