import { expect, test } from "@playwright/test";

/**
 * Editing the site's identity from the admin panel.
 *
 * The point of the feature is that a rename reaches the PUBLIC site, including its cached
 * pages — so that is what these check, rather than that a form accepted a value.
 */

test.describe.configure({ mode: "serial" });

const RENAMED = "Kabul Stone House";

test.afterAll(async ({ browser }) => {
  // Leave the shop as it was found; the other specs assert against the shipped name.
  const context = await browser.newContext({ storageState: "playwright/.auth/admin.json" });
  const page = await context.newPage();
  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Restore the original details" }).click();
  await context.close();
});

test("a rename reaches the storefront, the tab title and the footer", async ({
  page,
  browser,
}) => {
  await page.goto("/admin/settings");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save details" }) });
  await form.locator('[name="name"]').fill(RENAMED);
  await form.locator('[name="tagline"]').fill("Emeralds from the Panjshir");
  await form.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved. The whole site now uses these details.")).toBeVisible();

  // A visitor with no session, on the public site.
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const shop = await visitor.newPage();
  await shop.goto("/");

  await expect(shop.getByRole("banner").getByText(RENAMED.toUpperCase())).toBeVisible();
  await expect(shop).toHaveTitle(new RegExp(RENAMED));
  await expect(shop.getByRole("heading", { level: 1 })).toContainText("Emeralds from the Panjshir");
  // The home page is prerendered; a rename that did not invalidate it would still show the old name.
  await expect(shop.getByRole("contentinfo")).toContainText(RENAMED);
  await visitor.close();
});

test("the admin panel's own header follows the short name", async ({ page }) => {
  await page.goto("/admin/settings");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save details" }) });
  await form.locator('[name="shortName"]').fill("Kabul Stone");
  await form.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved. The whole site now uses these details.")).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("banner")).toContainText("Kabul Stone");
});

test("a name of only spaces is refused rather than blanking every page", async ({ page }) => {
  await page.goto("/admin/settings");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save details" }) });
  /*
   * Spaces rather than an empty string on purpose. The input is `required`, so the browser
   * refuses to submit an empty one and the server rule never runs — which proves nothing
   * about the server. Whitespace satisfies `required` and still has to be rejected, because
   * a blank name would empty the wordmark on every page of the site.
   */
  await form.locator('[name="name"]').fill("   ");
  await form.getByRole("button", { name: "Save details" }).click();

  await expect(page.getByText("Enter the business name")).toBeVisible();
});

test("restoring brings back the details the site shipped with", async ({ page, browser }) => {
  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Restore the original details" }).click();

  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const shop = await visitor.newPage();
  await shop.goto("/");
  await expect(shop.getByRole("banner").getByText("AFGHAN EMERALD CREST")).toBeVisible();
  await visitor.close();
});
