import { expect, test } from "@playwright/test";
import { ANONYMOUS, field, unique } from "./helpers";
import { formatMoney, toMinor } from "../../lib/money";
import { slugify } from "../../lib/slug";

/**
 * The dealer's path: list a stone, see it live, mark it sold, take it down.
 * These run with the session saved by the setup project.
 */

const EXPECTED_PRICE = formatMoney(toMinor(125_000));

function stoneFixture() {
  // Unique per run so the suite can be run repeatedly against the same database.
  const suffix = unique("t");
  const title = `Test Spinel ${suffix}`;
  return {
    // Not a form field any more: the address is derived from the title, so the test derives
    // it the same way rather than dictating it.
    expectedSlug: slugify(title),
    title,
    reference: `AEC-TEST-${suffix}`.toUpperCase(),
    description:
      "A stone created by the test suite to verify that the admin create path reaches the site.",
    caratWeight: "1.50",
    shape: "Cushion",
    colour: "Vivid red",
    lengthMm: "7.10",
    widthMm: "6.40",
    depthMm: "4.20",
    origin: "Jegdalek, Kabul Province, Afghanistan",
    treatment: "None (untreated)",
    priceRupees: "125000",
    imageUrl: "/img/gem/test-spinel/1",
    imageAlt: "Test spinel, view 1",
  };
}

async function fillStone(page: import("@playwright/test").Page, stone: Record<string, string>) {
  for (const [name, value] of Object.entries(stone)) {
    if (name === "expectedSlug") continue;
    await field(page, name).first().fill(value);
  }
  await field(page, "categoryId").selectOption({ label: "Spinel" });
}

test("an admin can publish a stone, change its status, and remove it", async ({ page }) => {
  const stone = stoneFixture();

  await page.goto("/admin/gems/new");
  await fillStone(page, stone);
  await field(page, "published").check();
  await page.getByRole("button", { name: "Add stone" }).click();
  await page.waitForURL(/\/admin\/gems\?/);
  await expect(page.getByText("Stone added.")).toBeVisible();

  // Visible to a buyer, at the price the admin entered.
  await page.goto(`/gem/${stone.expectedSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Test Spinel");
  /*
   * Formatted through the app's own formatter rather than a literal. The shop has changed
   * currency once already, and a hard-coded "Rs 125,000" here fails for a reason that has
   * nothing to do with what this test is about.
   */
  await expect(page.getByText(EXPECTED_PRICE)).toBeVisible();
  await expect(page.getByText("Enquire about this stone")).toBeVisible();

  // Mark it sold.
  await page.goto("/admin/gems");
  await page.getByRole("link", { name: stone.title }).click();
  await expect(page.getByText("Delete this stone")).toBeVisible();
  await field(page, "status").selectOption("sold");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto(`/gem/${stone.expectedSlug}`);
  await expect(page.getByText("This stone has sold")).toBeVisible();
  await expect(page.getByText("Enquire about this stone")).toHaveCount(0);

  // Soft delete: gone from the site, kept in the records.
  await page.goto("/admin/gems");
  await page.getByRole("link", { name: stone.title }).click();
  await page.getByRole("button", { name: "Delete stone" }).click();
  await page.waitForURL(/\/admin\/gems\?/);

  await expect(page.locator("tbody")).not.toContainText(stone.reference);
  await page.goto("/admin/gems?deleted=all");
  await expect(page.locator("tbody")).toContainText(stone.reference);

  const gone = await page.goto(`/gem/${stone.expectedSlug}`);
  expect(gone?.status()).toBe(404);
});

test("a duplicate stock reference is refused", async ({ page }) => {
  const stone = stoneFixture();
  await page.goto("/admin/gems/new");
  await fillStone(page, { ...stone, reference: "AEC-EM-0101" }); // already in the seed
  await page.getByRole("button", { name: "Add stone" }).click();

  await expect(page.getByText("Another stone already uses this reference.")).toBeVisible();
});

test("an unpublished stone is invisible to buyers but listed for the admin", async ({
  page,
  browser,
}) => {
  const stone = stoneFixture();

  await page.goto("/admin/gems/new");
  await fillStone(page, stone);
  // Left unpublished on purpose.
  await page.getByRole("button", { name: "Add stone" }).click();
  await page.waitForURL(/\/admin\/gems\?/);

  await expect(page.locator("tbody")).toContainText(stone.reference);
  await expect(page.locator("tbody")).toContainText("Draft");

  const buyer = await browser.newPage({ storageState: ANONYMOUS });
  const response = await buyer.goto(`/gem/${stone.expectedSlug}`);
  expect(response?.status()).toBe(404);
  await buyer.close();
});

test("an admin can add a variety and it appears in navigation", async ({ page }) => {
  const slug = unique("variety");

  await page.goto("/admin/categories");
  const form = page.locator("form").filter({ hasText: "Add variety" }).first();
  await form.locator('[name="name"]').fill(`Garnet ${slug}`);
  await form.locator('[name="slug"]').fill(slug);
  await form.locator('[name="description"]').fill("Test variety added by the suite.");
  await form.getByRole("button", { name: "Add variety" }).click();

  await expect(page.getByText("Variety added.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(`Garnet ${slug}`) }).first()).toBeVisible();
});

test("an admin can work an enquiry through to replied", async ({ page, browser }) => {
  // Sent as a buyer first, so this test does not depend on another test's leftovers.
  const buyer = await browser.newPage({ storageState: ANONYMOUS });
  await buyer.goto("/gem/pech-peridot-round-2-05ct");
  await field(buyer, "name").fill("Sara Iqbal");
  await field(buyer, "email").fill("sara@example.com");
  await field(buyer, "message").fill("Is this peridot still available, and what is the price?");
  await buyer.getByRole("button", { name: "Send enquiry" }).click();
  await expect(buyer.getByRole("status")).toContainText("Enquiry sent");
  await buyer.close();

  await page.goto("/admin/enquiries?status=new");
  await page.locator("tbody tr a").first().click();

  await field(page, "status").selectOption("replied");
  await field(page, "adminNote").fill("Quoted 21,000 by email.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Enquiry updated.")).toBeVisible();

  await page.goto("/admin/enquiries?status=replied");
  await expect(page.locator("tbody")).toContainText("sara@example.com");
});

test("the dashboard reports stock and enquiry counts", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stock" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest enquiries" })).toBeVisible();

  // The seeded catalogue is 23 stones; the tile must report a real figure, not a stub.
  const stones = page.getByRole("link", { name: /^Stones \d+$/ });
  await expect(stones).toBeVisible();
});


test("a stone saves without a slug, a cut, a clarity or an image description", async ({ page }) => {
  /*
   * The exact submission that used to be refused. A dealer typed the title into the field
   * labelled "URL slug" and got a message about hyphens; pasted an image address and got
   * "Describe the image". Neither field is on the form any more, and the save goes through.
   */
  const stone = stoneFixture();

  await page.goto("/admin/gems/new");
  await field(page, "title").fill(stone.title);
  await field(page, "reference").fill(stone.reference);
  await field(page, "description").fill(stone.description);
  await field(page, "categoryId").selectOption({ label: "Spinel" });
  await field(page, "caratWeight").fill("2.10");
  await field(page, "shape").fill("Cushion");
  await field(page, "colour").fill("Vivid red");
  await field(page, "lengthMm").fill("7");
  await field(page, "widthMm").fill("6");
  await field(page, "depthMm").fill("4");
  await field(page, "origin").fill("Jegdalek, Afghanistan");
  await field(page, "treatment").fill("None (untreated)");
  // A pasted address from anywhere, and no description typed for it.
  await field(page, "imageUrl").first().fill("https://images.example.com/a-spinel.jpg");
  await field(page, "published").check();
  await page.getByRole("button", { name: "Add stone" }).click();

  await page.waitForURL(/\/admin\/gems\?/);
  await expect(page.getByText("Stone added.")).toBeVisible();

  // The address was derived from the title, and the listing renders.
  await page.goto(`/gem/${stone.expectedSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(stone.title);
  // Alt text was filled in from the title rather than the save being refused for it.
  await expect(page.getByRole("img", { name: stone.title }).first()).toBeVisible();
  // Empty optional rows are dropped rather than shown blank.
  await expect(page.getByRole("row", { name: /^Cut/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /^Clarity/ })).toHaveCount(0);
  // Treatment is never dropped.
  await expect(page.getByRole("row", { name: /Treatment/ })).toContainText("None (untreated)");

  /*
   * Put it back. The storefront spec asserts an exact catalogue count, and a test that
   * leaves stock behind breaks a different file — which is a miserable way to find out,
   * because the failure names the innocent test.
   */
  await page.goto("/admin/gems");
  await page.getByRole("link", { name: stone.title }).click();
  await page.getByRole("button", { name: "Delete stone" }).click();
  await page.waitForURL(/\/admin\/gems\?/);
});

test("an uploaded photograph is stored and served back", async ({ page }) => {
  await page.goto("/admin/gems/new");

  // A one-pixel PNG is a real PNG: it passes the magic-number check on the server.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "stone.png",
    mimeType: "image/png",
    buffer: png,
  });

  const url = page.locator('form [name="imageUrl"]').first();
  await expect(url).toHaveValue(/^\/media\/[0-9a-f]{24}\.png$/, { timeout: 15_000 });

  // And the address it produced actually serves the image back.
  const stored = await url.inputValue();
  const response = await page.request.get(stored);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});

test("the upload endpoint refuses a request with no session", async ({ browser }) => {
  const stranger = await browser.newContext({ storageState: ANONYMOUS });
  const response = await stranger.request.post("/api/admin/media", {
    multipart: {
      file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("not a png") },
    },
  });
  // Unguarded, this would be free file hosting for whoever found it.
  expect(response.status()).toBe(401);
  await stranger.close();
});
