import { expect, test } from "@playwright/test";
import { ANONYMOUS, field } from "./helpers";

/**
 * Access control. The point of these tests is that a hidden link is not security: they
 * check the server's response, not whether a button was rendered.
 */

const ADMIN_ROUTES = [
  "/admin",
  "/admin/gems",
  "/admin/gems/new",
  "/admin/categories",
  "/admin/enquiries",
];

test.describe("as a logged-out visitor", () => {
  test.use({ storageState: ANONYMOUS });

  test("every admin route sends a logged-out visitor to sign in", async ({ page }) => {
    for (const route of ADMIN_ROUTES) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
    }
  });

  test("an admin server action refuses a request without a session", async ({ request }) => {
    // Posting straight at the endpoint, bypassing the UI entirely.
    const response = await request.post("/admin/gems/new", {
      headers: { "Next-Action": "0000000000000000000000000000000000000000" },
      form: { title: "Injected stone", slug: "injected-stone", reference: "REC-HACK-1" },
      maxRedirects: 0,
    });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers()["location"]).toContain("/login");
  });

  test("a forged session cookie does not grant admin access", async ({ page, context }) => {
    // A syntactically plausible but unsigned token. The signature check must reject it.
    await context.addCookies([
      {
        name: "rec_session",
        value:
          "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NmE1NzdmNzNhY2E2ZWY4YWFkYWY1NjEiLCJlbWFpbCI6" +
          "ImF0dGFja2VyQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwidmVyIjowfQ.not-a-valid-signature",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("credentials", () => {
  test.use({ storageState: ANONYMOUS });

  test("an unknown account gets the same message as a wrong password", async ({ page }) => {
    /*
     * Only one attempt is made here. Login is rate limited to five per fifteen minutes per
     * IP and email, and a suite that burns them on assertions locks itself out of the
     * tests that follow.
     *
     * The message must not distinguish "no such account" from "wrong password": either
     * would let someone enumerate who has an account.
     */
    await page.goto("/login");
    await field(page, "email").fill("nobody@example.com");
    await field(page, "password").fill("WrongPassword123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").first()).toContainText(
      "That email and password do not match",
    );
    await expect(page).toHaveURL(/\/login/);
  });
});

test("a signed-in admin reaches the panel", async ({ page }) => {
  // Uses the session saved by the setup project, so no extra login attempt is spent.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  // Scoped to the section nav: the dashboard also links to /admin/gems from a stat tile.
  await expect(
    page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Stones" }),
  ).toBeVisible();
});
