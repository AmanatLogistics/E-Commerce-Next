import { expect, test } from "@playwright/test";
import { ANONYMOUS, field } from "./helpers";

/**
 * The enquiry is the whole commercial mechanism of this site, so it is tested end to end:
 * the buyer sends one, and the dealer sees it in the inbox with the right stone attached.
 *
 * The buyer's half always runs anonymously; the dealer's half opens a signed-in page.
 */

test.use({ storageState: ANONYMOUS });

test("a buyer can send an enquiry and the dealer receives it", async ({ page, browser }) => {
  await page.goto("/gem/swat-emerald-oval-1-05ct");

  await field(page, "name").fill("Ayesha Khan");
  await field(page, "email").fill("ayesha@example.com");
  await field(page, "phone").fill("+92 300 1234567");
  await field(page, "message").fill(
    "I am interested in this emerald. Could you tell me whether a lab report is available?",
  );
  await page.getByRole("button", { name: "Send enquiry" }).click();

  const confirmation = page.getByRole("status");
  await expect(confirmation).toContainText("Enquiry sent");
  const reference = (await confirmation.locator("strong").textContent())?.trim() ?? "";
  expect(reference).toMatch(/^REC-[A-Z0-9]{6}$/);

  // The dealer's side, in a separate signed-in context.
  const admin = await browser.newPage({ storageState: "playwright/.auth/admin.json" });
  await admin.goto("/admin/enquiries");
  await admin.getByRole("link", { name: reference }).click();

  await expect(admin.getByText("ayesha@example.com")).toBeVisible();
  // The stone's identity comes from the database, not from the submitted form.
  await expect(admin.getByText("REC-EM-0102")).toBeVisible();
  await expect(admin.getByText(/lab report is available/)).toBeVisible();
  await admin.close();
});

test("the enquiry form rejects incomplete details server-side", async ({ page }) => {
  await page.goto("/gem/swat-emerald-oval-1-05ct");

  /*
   * These values pass the browser's own constraint validation, so the form actually
   * submits and the server's Zod schema is what rejects them. A malformed email would be
   * blocked by the browser before the request left, testing nothing of ours.
   */
  await field(page, "name").fill("A");
  await field(page, "email").fill("buyer@example.com");
  await field(page, "message").fill("hi");
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.getByText("Enter your name")).toBeVisible();
  await expect(page.getByText(/Tell us a little about what you are looking for/)).toBeVisible();
  await expect(page.getByText("Enquiry sent")).toHaveCount(0);
});

test("a general enquiry from the contact page reaches the same inbox", async ({ page, browser }) => {
  await page.goto("/contact");

  await field(page, "name").fill("Bilal Ahmed");
  await field(page, "email").fill("bilal@example.com");
  await field(page, "message").fill(
    "Do you have unheated Kashmir-blue sapphire in the two to three carat range?",
  );
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.getByRole("status")).toContainText("Enquiry sent");

  const admin = await browser.newPage({ storageState: "playwright/.auth/admin.json" });
  await admin.goto("/admin/enquiries");
  await expect(admin.getByText("bilal@example.com")).toBeVisible();
  await admin.close();
});
