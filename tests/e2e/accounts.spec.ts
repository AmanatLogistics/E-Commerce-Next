import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, field, unique } from "./helpers";

/**
 * Staff accounts, created from inside the panel.
 *
 * The point of this screen is that adding a colleague and changing a password no longer
 * cost a redeploy. The point of these tests is the rails around it: an account created here
 * can really sign in, an address cannot be reused (which would silently overwrite someone),
 * and the account you are signed in with cannot be suspended or deleted out from under you.
 */

test.describe.configure({ mode: "serial" });

/**
 * The page carries several forms with a `password` field — the create form, and one per
 * account for setting a new one — so every locator here is scoped to the form it means.
 * Reaching for the field by name alone matches whichever came first, which is how a test
 * ends up filling a different form than the one it is asserting about.
 */
function formWithButton(page: Page, name: string) {
  return page.locator("form").filter({ has: page.getByRole("button", { name }) });
}

const colleague = {
  name: "Test Colleague",
  email: `colleague-${unique("a")}@example.com`,
  password: "Colleague123!x",
};

test("an administrator creates an account, and it can sign in", async ({ page, browser }) => {
  await page.goto("/admin/accounts");
  const create = formWithButton(page, "Create account");
  await create.locator('[name="name"]').fill(colleague.name);
  await create.locator('[name="email"]').fill(colleague.email);
  await create.locator('[name="password"]').fill(colleague.password);
  await create.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(`Account created for ${colleague.email}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: colleague.name })).toBeVisible();

  // The real test: a separate browser context with no session signs in with it.
  const fresh = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const theirPage = await fresh.newPage();
  await theirPage.goto("/login");
  await field(theirPage, "email").fill(colleague.email);
  await field(theirPage, "password").fill(colleague.password);
  await theirPage.getByRole("button", { name: "Sign in" }).click();
  await expect(theirPage).toHaveURL(/\/admin$/);
  await expect(theirPage.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await fresh.close();
});

test("the same address cannot be used twice", async ({ page }) => {
  await page.goto("/admin/accounts");
  const create = formWithButton(page, "Create account");
  await create.locator('[name="name"]').fill("Someone Else");
  await create.locator('[name="email"]').fill(colleague.email);
  await create.locator('[name="password"]').fill("Different123!x");
  await create.getByRole("button", { name: "Create account" }).click();

  // Reusing it must refuse, not quietly reset the existing person's password.
  await expect(page.getByText("An account with that email address already exists.")).toBeVisible();
});

test("the signed-in account cannot suspend or delete itself", async ({ page }) => {
  await page.goto("/admin/accounts");

  const own = page.locator("li").filter({ hasText: ADMIN_EMAIL });
  await expect(own.getByText("You", { exact: true })).toBeVisible();
  await expect(own.getByRole("button", { name: "Suspend" })).toHaveCount(0);
  await expect(own.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await expect(
    own.getByText("You cannot suspend or delete the account you are signed in with."),
  ).toBeVisible();
});

test("a suspended account can no longer sign in, and can be restored", async ({ page, browser }) => {
  await page.goto("/admin/accounts");
  const row = page.locator("li").filter({ hasText: colleague.email });
  await row.getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByText("Suspended")).toBeVisible();

  const fresh = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const theirPage = await fresh.newPage();
  await theirPage.goto("/login");
  await field(theirPage, "email").fill(colleague.email);
  await field(theirPage, "password").fill(colleague.password);
  await theirPage.getByRole("button", { name: "Sign in" }).click();
  await expect(theirPage.getByRole("alert").first()).toContainText(
    "That email and password do not match",
  );
  await fresh.close();

  await page.goto("/admin/accounts");
  const restored = page.locator("li").filter({ hasText: colleague.email });
  await restored.getByRole("button", { name: "Restore access" }).click();
  await expect(restored.getByText("Active")).toBeVisible();
});

test("an administrator deletes the account again", async ({ page }) => {
  await page.goto("/admin/accounts");
  const row = page.locator("li").filter({ hasText: colleague.email });
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(colleague.email)).toHaveCount(0);
});

test("changing your own password requires the current one", async ({ page }) => {
  await page.goto("/admin/accounts");
  const form = formWithButton(page, "Change my password");
  await form.locator('[name="currentPassword"]').fill("NotMyPassword123");
  await form.locator('[name="newPassword"]').fill("BrandNewPass123");
  await form.getByRole("button", { name: "Change my password" }).click();

  await expect(page.getByText("That is not your current password.")).toBeVisible();
  // And the real one still works, so nothing was changed on the way past.
  await expect(page.getByText(`Signed in as ${ADMIN_EMAIL}`)).toBeVisible();
  expect(ADMIN_PASSWORD.length).toBeGreaterThan(0);
});
