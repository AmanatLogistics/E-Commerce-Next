import { expect, test } from "@playwright/test";
import { ANONYMOUS, field, unique } from "./helpers";

/**
 * The dealer's path: list a stone, see it live, mark it sold, take it down.
 * These run with the session saved by the setup project.
 */

function stoneFixture() {
  // Unique per run so the suite can be run repeatedly against the same database.
  const suffix = unique("t");
  return {
    title: `Test Spinel ${suffix}`,
    reference: `KG-TEST-${suffix}`.toUpperCase(),
    slug: `test-spinel-${suffix}`,
    description:
      "A stone created by the test suite to verify that the admin create path reaches the site.",
    caratWeight: "1.50",
    shape: "Cushion",
    cut: "Mixed brilliant",
    clarity: "Eye clean",
    colour: "Vivid red",
    lengthMm: "7.10",
    widthMm: "6.40",
    depthMm: "4.20",
    origin: "Hunza Valley, Pakistan",
    treatment: "None (untreated)",
    priceRupees: "125000",
    imageUrl: "/img/gem/test-spinel/1",
    imageAlt: "Test spinel, view 1",
  };
}

async function fillStone(page: import("@playwright/test").Page, stone: Record<string, string>) {
  for (const [name, value] of Object.entries(stone)) {
    await field(page, name).fill(value);
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
  await page.goto(`/gem/${stone.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Test Spinel");
  await expect(page.getByText("Rs 125,000")).toBeVisible();
  await expect(page.getByText("Enquire about this stone")).toBeVisible();

  // Mark it sold.
  await page.goto("/admin/gems");
  await page.getByRole("link", { name: stone.title }).click();
  await expect(page.getByText("Delete this stone")).toBeVisible();
  await field(page, "status").selectOption("sold");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto(`/gem/${stone.slug}`);
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

  const gone = await page.goto(`/gem/${stone.slug}`);
  expect(gone?.status()).toBe(404);
});

test("a duplicate stock reference is refused", async ({ page }) => {
  const stone = stoneFixture();
  await page.goto("/admin/gems/new");
  await fillStone(page, { ...stone, reference: "KG-EM-0101" }); // already in the seed
  await page.getByRole("button", { name: "Add stone" }).click();

  await expect(page.getByText("Another stone already uses this value.")).toBeVisible();
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
  const response = await buyer.goto(`/gem/${stone.slug}`);
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
  await buyer.goto("/gem/sapat-peridot-round-2-05ct");
  await field(buyer, "name").fill("Sara Iqbal");
  await field(buyer, "email").fill("sara@example.com");
  await field(buyer, "message").fill("Is this peridot still available, and what is the price?");
  await buyer.getByRole("button", { name: "Send enquiry" }).click();
  await expect(buyer.getByRole("status")).toContainText("Enquiry sent");
  await buyer.close();

  await page.goto("/admin/enquiries?status=new");
  await page.locator("tbody tr a").first().click();

  await field(page, "status").selectOption("replied");
  await field(page, "adminNote").fill("Quoted Rs 21,000 by email.");
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
