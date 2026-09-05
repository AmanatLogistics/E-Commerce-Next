import type { Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@afghanemeraldcrest.example";
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "AdminPass123!";

/** No cookies at all — for tests that must observe what an anonymous visitor sees. */
export const ANONYMOUS = { cookies: [], origins: [] };

/**
 * Fields are located by their `name`, scoped to a form: label text carries a required
 * asterisk, and a bare `[name="description"]` also matches the page's meta tag.
 */
export function field(page: Page, name: string) {
  return page.locator(`form [name="${name}"]`);
}

/** Unique per run, so a test that creates a record can be run repeatedly. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}
