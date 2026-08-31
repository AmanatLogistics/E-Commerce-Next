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
import { siteConfig } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

/** Pre-render the catalogue; stock changes revalidate within five minutes. */
export async function generateStaticParams() {
  const slugs = await getAllGemSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gem = await getGemBySlug(slug);
  if (!gem) return { title: "Stone not found" };

  const summary = `${gem.caratWeight.toFixed(2)} ct ${gem.shape.toLowerCase()} from ${gem.origin}. ${gem.treatment}.`;

  return {
    title: gem.title,
    description: summary,
    alternates: { canonical: `/gem/${gem.slug}` },
    openGraph: {
      type: "website",
      title: `${gem.title} · ${siteConfig.name}`,
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
    <div className="mx-auto max-w-6xl px-4 py-8">
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

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <GemGallery images={gem.images} title={gem.title} />

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GemStatusBadge status={gem.status} />
              {untreated && <Badge tone="accent">Untreated</Badge>}
            </div>
            <h1 className="text-h1 mt-3">{gem.title}</h1>
            <p className="label-caps mt-2">{gem.reference}</p>
          </div>

          <div className="border-y py-4">
            <GemPrice priceMinor={gem.priceMinor} size="lg" />
            <p className="mt-1 text-sm text-ink-muted">
              {gem.priceMinor === null
                ? "Send an enquiry and we will quote for this stone directly."
                : `Excludes shipping and any duties. Quoted in ${siteConfig.currency}.`}
            </p>
          </div>

          <div>
            <h2 className="text-h3">About this stone</h2>
            <p className="mt-2 whitespace-pre-line text-body text-ink-muted">{gem.description}</p>
          </div>

          <div>
            <h2 className="text-h3 border-b pb-2">Specification</h2>
            <div className="mt-1">
              <GemSpecTable gem={gem} />
            </div>
          </div>

          <div id="enquire" className="rounded-[var(--radius-md)] border bg-surface-sunken p-5">
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
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="text-h2 border-b pb-3">
            Other {category?.name.toLowerCase() ?? "stones"}
          </h2>
          <div className="mt-6">
            <GemGrid gems={related} />
          </div>
        </section>
      )}
    </div>
  );
}
