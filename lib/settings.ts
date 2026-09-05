import "server-only";
import { cache } from "react";
import { settings } from "./db/collections";
import { siteConfig } from "./site-config";
import type { SettingsDoc } from "./db/documents";

/**
 * The site's identity, as the running site sees it.
 *
 * lib/site-config.ts holds the DEFAULTS. This reads the one stored settings document over
 * the top of them, so the business can be renamed, or a phone number corrected, from
 * /admin/settings rather than from a deploy. A database with nothing stored — a fresh
 * install, or one that cannot be reached at this instant — renders a complete site from the
 * defaults alone.
 *
 * Not everything in siteConfig is editable, and the split is deliberate:
 *
 *  - Text a dealer owns (name, tagline, contact details, the four promises) is editable.
 *  - Structure the code depends on is not. `currency` and `formatLocale` feed a synchronous
 *    Intl formatter used inside components that cannot await; `enquiryPrefix` is baked into
 *    references already issued to buyers, so changing it would orphan them; `url` comes from
 *    the hosting platform. Those stay in code, where changing them is reviewed.
 */

export interface EditableSettings {
  name: string;
  shortName: string;
  initials: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  promises: { title: string; body: string }[];
}

/** Everything a page needs: the fixed half of siteConfig plus the editable half. */
export type SiteSettings = Omit<typeof siteConfig, keyof EditableSettings> & EditableSettings;

export const EDITABLE_FIELDS = [
  "name",
  "shortName",
  "initials",
  "tagline",
  "description",
  "contactEmail",
  "contactPhone",
  "address",
] as const;

export function defaultSettings(): EditableSettings {
  return {
    name: siteConfig.name,
    shortName: siteConfig.shortName,
    initials: siteConfig.initials,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    contactEmail: siteConfig.contactEmail,
    contactPhone: siteConfig.contactPhone,
    address: siteConfig.address,
    promises: siteConfig.promises.map((promise) => ({ ...promise })),
  };
}

function merge(stored: SettingsDoc | null): SiteSettings {
  const base = { ...siteConfig, ...defaultSettings() } as SiteSettings;
  if (!stored) return base;

  const overrides: Partial<EditableSettings> = {};
  for (const field of EDITABLE_FIELDS) {
    const value = stored[field];
    // An empty string is not an override, it is a field nobody filled in. Falling back keeps
    // a half-completed form from blanking the business name across the whole site.
    if (typeof value === "string" && value.trim().length > 0) overrides[field] = value.trim();
  }
  if (Array.isArray(stored.promises) && stored.promises.length > 0) {
    overrides.promises = stored.promises.map((promise) => ({
      title: String(promise.title ?? ""),
      body: String(promise.body ?? ""),
    }));
  }
  return { ...base, ...overrides };
}

/**
 * Read once per render, not once per component.
 *
 * The header, the footer, the metadata and the page body all want the business name, and
 * without this each would be its own round trip. React's cache() dedupes them within a
 * single render pass and does not leak between requests.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return merge(await settings().findOne({ key: "site" }));
  } catch (error) {
    /*
     * Identity must never take the site down. Every page renders the business name — if a
     * database hiccup could throw here, one slow query would turn the whole site, including
     * the pages that need no database at all, into an error screen.
     */
    console.warn(`Could not read site settings, using defaults: ${(error as Error).message}`);
    return merge(null);
  }
});

/** Reads through the same merge, but never cached — for the admin form, which must see writes. */
export async function readSettingsForEditing(): Promise<EditableSettings> {
  try {
    const merged = merge(await settings().findOne({ key: "site" }));
    return {
      name: merged.name,
      shortName: merged.shortName,
      initials: merged.initials,
      tagline: merged.tagline,
      description: merged.description,
      contactEmail: merged.contactEmail,
      contactPhone: merged.contactPhone,
      address: merged.address,
      promises: merged.promises,
    };
  } catch {
    return defaultSettings();
  }
}

export async function saveSiteSettings(values: EditableSettings): Promise<void> {
  await settings().updateOne(
    { key: "site" },
    { $set: { ...values, key: "site", updatedAt: new Date() } },
    { upsert: true },
  );
}

/** Restores every field to the value in lib/site-config.ts by removing the override. */
export async function resetSiteSettings(): Promise<void> {
  await settings().deleteOne({ key: "site" });
}
