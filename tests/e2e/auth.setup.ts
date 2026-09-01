import { test as setup } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, field } from "./helpers";

export const ADMIN_STATE = "playwright/.auth/admin.json";

/**
 * Signs in once per run and saves the session for every test that needs it.
 *
 * Not just a speed optimisation: login is rate limited to five attempts per fifteen
 * minutes per IP and email, so a suite that signed in on every test would lock itself out
 * — which is exactly what happened before this existed.
 */
setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await field(page, "email").fill(ADMIN_EMAIL);
  await field(page, "password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 30_000 });
  await page.context().storageState({ path: ADMIN_STATE });
});
