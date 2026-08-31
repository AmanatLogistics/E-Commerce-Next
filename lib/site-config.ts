/**
 * Every user-visible mention of the store's identity comes from here.
 * Renaming the store is a change to this file and nothing else.
 */
export const siteConfig = {
  name: "Chowk",
  tagline: "Electronics and home goods, honestly priced",
  description:
    "A marketplace for consumer electronics and home goods — phones, audio, kitchen, " +
    "home comfort, lighting and cleaning — delivered across Pakistan.",
  locale: "en-PK",
  currency: "PKR",
  /** Order numbers look like CHK-8F3K2A. */
  orderPrefix: "CHK",
  supportEmail: "support@chowk.example",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
