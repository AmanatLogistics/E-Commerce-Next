import { expect, test } from "@playwright/test";
import { ANONYMOUS } from "./helpers";

/** The buyer's path: find a stone and read its details. Always as an anonymous visitor. */

test.use({ storageState: ANONYMOUS });

test("home page lists varieties and selected stones", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "By variety" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Emerald/ }).first()).toBeVisible();
});

test("collection filters, sorts and paginates from the URL", async ({ page }) => {
  await page.goto("/collection");
  const counter = page.locator("[aria-live=polite]").first();
  await expect(counter).toContainText("23 stones");

  await page.goto("/collection/emerald");
  await expect(counter).toContainText("4 stones");

  await page.goto("/collection?untreated=1");
  await expect(counter).toContainText("20 stones");

  await page.goto("/collection?available=1");
  await expect(counter).toContainText("21 stones");

  /*
   * Three, not six: the old Hunza filter caught the rubies and the spinels together,
   * because both came from the same valley. Jegdalek is the rubies; the spinels are
   * Badakhshan now.
   */
  await page.goto("/collection?origin=Jegdalek");
  await expect(counter).toContainText("3 stones");
});

test("search matches names and looks up a stock reference exactly", async ({ page }) => {
  await page.goto("/collection?q=aquamarine");
  await expect(page.locator("[aria-live=polite]").first()).toContainText("4 stones");

  // A reference must not be tokenised: "KG" alone would otherwise match every stone.
  await page.goto("/collection?q=AEC-EM-0101");
  await expect(page.locator("[aria-live=polite]").first()).toContainText("1 stone");

  await page.goto("/collection?q=AEC-ZZ-9999");
  await expect(page.getByText(/Nothing matches/)).toBeVisible();
});

test("an empty result offers a way forward rather than a dead end", async ({ page }) => {
  await page.goto("/collection?q=diamond");
  await expect(page.getByText(/Nothing matches “diamond”/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear search and filters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse a variety instead" })).toBeVisible();
});

test("a stone page shows the full specification with treatment disclosed", async ({ page }) => {
  await page.goto("/gem/panjshir-emerald-emerald-cut-2-14ct");

  // "Panjshir" here is the deposit the stone came from, not the shop's name.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Panjshir Emerald");
  await expect(page.getByText("AEC-EM-0101").first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Carat weight/ })).toContainText("2.14 ct");
  await expect(page.getByRole("row", { name: /Dimensions/ })).toContainText(
    "8.42 × 6.18 × 4.55 mm",
  );
  // Treatment is never omitted — disclosure is a trade obligation.
  await expect(page.getByRole("row", { name: /Treatment/ })).toBeVisible();
  await expect(page.getByText("Price on request")).toBeVisible();
});

test("the gallery navigates between views", async ({ page }) => {
  await page.goto("/gem/panjshir-emerald-emerald-cut-2-14ct");

  // Stones carry 3 or 4 views, so the counter is matched by shape rather than a fixed total.
  const counter = page.getByText(/^\d+ \/ \d+$/);
  await expect(counter).toHaveText(/^1 \/ \d+$/);

  await page.getByRole("button", { name: "Next view" }).click();
  await expect(counter).toHaveText(/^2 \/ \d+$/);

  await page.getByRole("button", { name: "Previous view" }).click();
  await expect(counter).toHaveText(/^1 \/ \d+$/);
});

test("a sold stone cannot be enquired on", async ({ page }) => {
  await page.goto("/gem/jegdalek-ruby-cabochon-3-05ct");
  await expect(page.getByText("This stone has sold")).toBeVisible();
  await expect(page.getByText("Enquire about this stone")).toHaveCount(0);
});

test("unknown stones and varieties return a real 404, not a soft one", async ({ page }) => {
  /*
   * Regression guard. A route-level loading.tsx makes a route stream, and a streamed
   * response has already sent 200 by the time the page calls notFound(). Adding one turned
   * every missing stone into a 200 with 404 content — invisible in a browser, wrong for
   * search engines and for uptime monitoring. The skeleton now lives in a Suspense boundary
   * inside the page instead.
   */
  const missingStone = await page.goto("/gem/no-such-stone-exists");
  expect(missingStone?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /could not find that page/i })).toBeVisible();

  const missingVariety = await page.goto("/collection/no-such-variety");
  expect(missingVariety?.status()).toBe(404);

  const realStone = await page.goto("/gem/panjshir-emerald-oval-1-05ct");
  expect(realStone?.status()).toBe(200);
});

test("the storefront is usable at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/collection");
  // Nothing may overflow horizontally at the narrowest supported width.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});


test("a clicked navigation link shows it is working, and the results stream", async ({ page }) => {
  /*
   * The variety pages render on demand, so there is a round trip between the click and the
   * new page. Silence in that gap reads as the click having missed — people click again,
   * and the second click makes it slower.
   */
  await page.goto("/collection");
  // The variety rail renders for both breakpoints, so there are two of each link.
  const ruby = page
    .getByRole("navigation", { name: "Gem varieties" })
    .getByRole("link", { name: "Ruby", exact: true })
    .first();
  const bar = ruby.locator("span[aria-hidden]");

  // Tailwind v4 sets the standalone `scale` property, not `transform`.
  await expect
    .poll(async () => bar.evaluate((el) => getComputedStyle(el).scale))
    .toBe("0 1");

  await ruby.click();
  await page.waitForURL("**/collection/ruby");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ruby");
});

test("motion is switched off for anyone who asked for reduced motion", async ({ browser }) => {
  // Not shortened — off. Motion makes some people ill, and a brief animation is still one.
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/collection");

  const card = page.locator(".stagger > *").first();
  await expect(card).toBeVisible();
  expect(await card.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

  const main = page.locator("main#main");
  expect(await main.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await context.close();
});
