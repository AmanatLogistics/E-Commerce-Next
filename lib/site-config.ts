/**
 * Every user-visible mention of the business's identity comes from here.
 * Renaming the business is a change to this file and nothing else.
 */
export const siteConfig = {
  name: "Royal Emerald Crest",
  shortName: "Royal Emerald",
  /** Used where the full name will not fit, e.g. the mobile wordmark. */
  initials: "REC",
  tagline: "Rare emeralds and fine coloured stones",
  description:
    "Ethically sourced loose gemstones — emerald, ruby, spinel, aquamarine, topaz, " +
    "tourmaline and peridot — from Swat, Hunza, Skardu, Katlang and Kohistan. " +
    "Every stone is photographed as it is and available to enquire on.",
  locale: "en-PK",
  currency: "PKR",
  /** Enquiry references look like REC-7Q2M4X. */
  enquiryPrefix: "REC",
  contactEmail: "enquiries@royalemeraldcrest.example",
  contactPhone: "+92 51 000 0000",
  address: "Blue Area, Islamabad, Pakistan",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** The promises shown in the announcement bar and the trust strip. */
  promises: [
    { title: "Every treatment disclosed", body: "On every listing, including when there is none." },
    { title: "Independent lab reports", body: "Available on request for higher-value stones." },
    { title: "Insured worldwide delivery", body: "Fully tracked and insured to your door." },
    { title: "Seven-day inspection", body: "Return an unset stone within seven days." },
  ],
} as const;
