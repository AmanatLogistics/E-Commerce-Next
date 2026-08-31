/**
 * Every user-visible mention of the business's identity comes from here.
 * Renaming the store is a change to this file and nothing else.
 */
export const siteConfig = {
  name: "Karakoram Gems",
  shortName: "Karakoram",
  tagline: "Fine loose gemstones from Pakistan's northern mines",
  description:
    "Ethically sourced loose gemstones — emerald, ruby, spinel, aquamarine, topaz, " +
    "tourmaline and peridot — from Swat, Hunza, Skardu, Katlang and Kohistan. " +
    "Every stone is photographed as it is and available to enquire on.",
  locale: "en-PK",
  currency: "PKR",
  /** Enquiry references look like KG-7Q2M4X. */
  enquiryPrefix: "KG",
  contactEmail: "enquiries@karakoramgems.example",
  contactPhone: "+92 51 000 0000",
  address: "Blue Area, Islamabad, Pakistan",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
