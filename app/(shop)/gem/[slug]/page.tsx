import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GemGallery } from "@/components/gem/gallery";
import { GemGrid } from "@/components/gem/gem-card";
import { GemPrice } from "@/components/gem/price";
import { GemSpecTable } from "@/components/gem/spec-table";
import { GemStatusBadge, isEnquirable } from "@/components/gem/status-badge";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllGemSlugs, getCategoryBySlug, getGemBySlug, getRelatedGems } from "@/lib/gems/queries";
import { readDuringBuild } from "@/lib/db/build-safe";
import { siteConfig } from "@/lib/site-config";
import { getSiteSettings } from "@/lib/settings";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

/**
 * Pre-render the catalogue when the database is reachable from the build machine, and
 * simply do not when it is not — the pages are then rendered on first request and cached
 * by the same `revalidate` above, which is what a cache miss does anyway. A deploy must
 * never fail because a build host cannot reach a database.
 */
export async function generateStaticParams() {
  const slugs = await readDuringBuild("stone slugs", getAllGemSlugs, []);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gem = await getGemBySlug(slug);
  if (!gem) return { title: "Stone not found" };

  const summary = `${gem.caratWeight.toFixed(2)} ct ${gem.shape.toLowerCase()} from ${gem.origin}. ${gem.treatment}.`;
  const { name } = await getSiteSettings();

  return {
    title: gem.title,
    description: summary,
    alternates: { canonical: `/gem/${gem.slug}` },
    openGraph: {
      type: "website",
      title: `${gem.title} · ${name}`,
      description: summary,
      images: gem.images.slice(0, 1).map((image) => ({
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      })),
    },
  };
}

export default async function GemPage({ params }: Props) {
  const { slug } = await params;
  const gem = await getGemBySlug(slug);
  if (!gem) notFound();

  const [category, related] = await Promise.all([
    getCategoryBySlug(gem.categorySlug),
    getRelatedGems(gem, 4),
  ]);

  const untreated = /^none/i.test(gem.treatment);

  /**
   * Product structured data. `availability` reflects the real status, and the price is
   * only asserted when there is one — a "price on request" stone must not claim a number.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: gem.title,
    sku: gem.reference,
    description: gem.description,
    image: gem.images.map((image) => new URL(image.url, siteConfig.url).toString()),
    category: category?.name ?? gem.categorySlug,
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/gem/${gem.slug}`,
      availability:
        gem.status === "available"
          ? "https://schema.org/InStock"
          : gem.status === "reserved"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/SoldOut",
      ...(gem.priceMinor !== null
        ? { price: (gem.priceMinor / 100).toFixed(0), priceCurrency: siteConfig.currency }
        : {}),
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        // Serialised from our own database record, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/collection" className="hover:text-accent">
          All stones
        </Link>
        <span aria-hidden="true" className="px-2">/</span>
        <Link href={`/collection/${gem.categorySlug}`} className="hover:text-accent">
          {category?.name ?? gem.categorySlug}
        </Link>
        <span aria-hidden="true" className="px-2">/</span>
        <span aria-current="page" className="text-ink">{gem.reference}</span>
      </nav>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        {/*
          * Sticky on desktop: the specification and the enquiry form run long, and a buyer
          * reading "vivid red, eye clean, 7.80 × 6.05 mm" wants the stone still in view.
          */}
        <div className="lg:sticky lg:top-28">
          <GemGallery images={gem.images} title={gem.title} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="label-caps">{category?.name ?? gem.categorySlug}</p>
            <h1 className="text-h1 mt-2">{gem.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <GemStatusBadge status={gem.status} />
              {untreated && <Badge tone="accent">Untreated</Badge>}
              <span className="label-caps">{gem.reference}</span>
            </div>
          </div>

          <div className="border-y py-5">
            <GemPrice priceMinor={gem.priceMinor} size="lg" />
            <p className="mt-2 text-sm text-ink-muted">
              {gem.priceMinor === null
                ? "Send an enquiry and we will quote for this stone directly."
                : `Excludes shipping and any duties. Quoted in ${siteConfig.currency}.`}
            </p>
          </div>

          <div>
            <p className="whitespace-pre-line text-body text-ink-muted">{gem.description}</p>
          </div>

          <div>
            <h2 className="text-h3 crest-rule">Specification</h2>
            <div className="mt-4">
              <GemSpecTable gem={gem} />
            </div>
          </div>

          <div id="enquire" className="rounded-[var(--radius-lg)] border bg-surface p-6">
            {isEnquirable(gem.status) ? (
              <EnquiryForm
                gemSlug={gem.slug}
                gemTitle={gem.title}
                gemReference={gem.reference}
              />
            ) : (
              <div>
                <h3 className="text-h3">This stone has sold</h3>
                <p className="mt-1 text-body text-ink-muted">
                  {gem.title} is no longer available. We can often find something comparable —
                  tell us what you are looking for and we will let you know when it comes in.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/contact">Ask for something similar</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-20">
          <div className="text-center">
            <h2 id="related-heading" className="text-h2 crest-rule crest-rule-center">
              More {category?.name.toLowerCase() ?? "stones"}
            </h2>
          </div>
          <div className="mt-10">
            <GemGrid gems={related} />
          </div>
        </section>
      )}
    </div>
  );
}
