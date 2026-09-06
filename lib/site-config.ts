function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Set by Vercel on every deployment; the production domain, even in a preview build.
  const vercelDomain =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelDomain) return `https://${vercelDomain}`;

  return "http://localhost:3000";
}

/**
 * Every user-visible mention of the business's identity comes from here.
 * Renaming the business is a change to this file and nothing else.
 */
export const siteConfig = {
  name: "Afghan Emerald Crest",
  shortName: "Afghan Emerald",
  /** Used where the full name will not fit, e.g. the mobile wordmark. */
  initials: "AEC",
  tagline: "Rare emeralds and fine coloured stones",
  description:
    "Ethically sourced loose gemstones — emerald, ruby, spinel, aquamarine, topaz, " +
    "tourmaline and peridot — from Panjshir, Jegdalek, Badakhshan, Nuristan and Kunar. " +
    "Every stone is photographed as it is and available to enquire on.",
  /**
   * What the page IS: English, Afghanistan. Used for the html lang attribute, where naming
   * the country is the point and no formatting data is needed.
   */
  locale: "en-AF",
  /**
   * What Intl should format LIKE, which is not the same question.
   *
   * ICU has no data for en-AF and quietly resolves it to plain "en" — and "en" writes dates
   * American month-first, "Sep 5, 2026". Afghanistan reads them day-first, so a stray
   * fallback would have quietly Americanised every date in the admin panel. en-GB is the
   * nearest locale with real data and the right conventions; the currency is chosen
   * separately below, so this decides ordering and separators only.
   */
  formatLocale: "en-GB",
  currency: "AFN",
  /** Enquiry references look like AEC-7Q2M4X. */
  enquiryPrefix: "AEC",
  contactEmail: "enquiries@afghanemeraldcrest.example",
  contactPhone: "+93 20 000 0000",
  /**
   * The floating WhatsApp button, and the shortest path a buyer has to a conversation.
   * Clearing it in Site details removes the button; see lib/settings.ts.
   */
  whatsappNumber: "+93 70 280 0277",
  address: "Panjshir Valley, Afghanistan",
  /**
   * Used for metadata, structured data and the links in enquiry emails.
   *
   * VERCEL_PROJECT_PRODUCTION_URL and VERCEL_URL are set automatically by Vercel, so a
   * deployment there needs no configuration for this. Only read on the server (metadata,
   * JSON-LD, email), so the non-public Vercel variables are never wanted in a browser.
   */
  url: resolveSiteUrl(),
  /** The promises shown in the announcement bar and the trust strip. */
  promises: [
    { title: "Every treatment disclosed", body: "On every listing, including when there is none." },
    { title: "Independent lab reports", body: "Available on request for higher-value stones." },
    { title: "Insured worldwide delivery", body: "Fully tracked and insured to your door." },
    { title: "Seven-day inspection", body: "Return an unset stone within seven days." },
  ],
} as const;
