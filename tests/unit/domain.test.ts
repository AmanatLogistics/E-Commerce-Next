import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMoney, rupees, toRupees } from "../../lib/money";
import { rateLimit, resetRateLimits } from "../../lib/auth/rate-limit";
import { buildBrowseHref, parseBrowseParams } from "../../lib/browse-params";
import { contactSchema, enquirySchema, gemInputSchema } from "../../lib/validation/schemas";

describe("money", () => {
  it("stores whole rupees as integer paisa", () => {
    assert.equal(rupees(125_000), 12_500_000);
    assert.equal(rupees(1), 100);
    assert.equal(toRupees(12_500_000), 125_000);
  });

  it("round-trips without floating-point drift", () => {
    for (const value of [1, 7, 999, 62_999, 189_999, 1_000_000]) {
      assert.equal(toRupees(rupees(value)), value);
    }
  });

  it("formats in the store's locale and currency", () => {
    const formatted = formatMoney(rupees(125_000));
    assert.match(formatted, /125,000/);
    assert.match(formatted, /Rs|PKR|₨/);
  });
});

describe("browse params", () => {
  it("falls back to safe defaults for junk input", () => {
    const params = parseBrowseParams({ page: "-4", sort: "'; DROP TABLE gems", cat: "<script>" });
    assert.equal(params.page, 1);
    assert.equal(params.sort, "newest");
    assert.deepEqual(params.categories, []);
  });

  it("accepts a comma-separated category list and de-duplicates it", () => {
    const params = parseBrowseParams({ cat: "emerald,ruby,emerald" });
    assert.deepEqual(params.categories, ["emerald", "ruby"]);
  });

  it("drops default values when building a URL, so links stay clean", () => {
    const params = parseBrowseParams({});
    assert.equal(buildBrowseHref("/collection", params), "/collection");
    assert.equal(
      buildBrowseHref("/collection", params, { untreatedOnly: true }),
      "/collection?untreated=1",
    );
    assert.equal(buildBrowseHref("/collection", params, { page: 3 }), "/collection?page=3");
  });

  it("caps a very long query rather than passing it straight through", () => {
    const params = parseBrowseParams({ q: "a".repeat(500) });
    assert.equal(params.q.length, 120);
  });
});

describe("enquiry validation", () => {
  const valid = {
    gemSlug: "swat-emerald-oval-1-05ct",
    name: "Ayesha Khan",
    email: "Ayesha@Example.COM ",
    phone: "+92 300 1234567",
    message: "Is a lab report available for this stone?",
  };

  it("accepts a complete enquiry and normalises the email", () => {
    const parsed = enquirySchema.safeParse(valid);
    assert.ok(parsed.success);
    assert.equal(parsed.data.email, "ayesha@example.com");
  });

  it("rejects a short name, a bad email and a thin message", () => {
    const parsed = enquirySchema.safeParse({ ...valid, name: "A", email: "nope", message: "hi" });
    assert.equal(parsed.success, false);
    const fields = parsed.error!.issues.map((issue) => String(issue.path[0]));
    assert.ok(fields.includes("name"));
    assert.ok(fields.includes("email"));
    assert.ok(fields.includes("message"));
  });

  it("allows a blank phone number but rejects a malformed one", () => {
    assert.ok(enquirySchema.safeParse({ ...valid, phone: "" }).success);
    assert.equal(enquirySchema.safeParse({ ...valid, phone: "call me!" }).success, false);
  });

  it("rejects a filled honeypot", () => {
    assert.equal(enquirySchema.safeParse({ ...valid, website: "http://spam" }).success, false);
  });

  it("has no field a price or a status could arrive in", () => {
    const parsed = enquirySchema.safeParse({ ...valid, priceMinor: 1, status: "closed" });
    assert.ok(parsed.success);
    assert.equal("priceMinor" in parsed.data, false);
    assert.equal("status" in parsed.data, false);
  });

  it("the contact form is the same schema without a stone", () => {
    const withoutStone = { ...valid, gemSlug: undefined };
    delete withoutStone.gemSlug;
    assert.ok(contactSchema.safeParse(withoutStone).success);
  });
});

describe("gem input validation", () => {
  const valid = {
    title: "Swat Emerald, Emerald Cut, 2.14 ct",
    slug: "swat-emerald-emerald-cut-2-14ct",
    reference: "KG-EM-0101",
    description: "A step-cut emerald from the Swat valley with a bluish green colour.",
    categoryId: "66a577f73aca6ef8aadaf561",
    caratWeight: 2.14,
    shape: "Rectangular",
    cut: "Emerald cut",
    colour: "Bluish green",
    clarity: "Slightly included",
    lengthMm: 8.42,
    widthMm: 6.18,
    depthMm: 4.55,
    origin: "Swat Valley, Pakistan",
    treatment: "None (untreated)",
    images: [{ url: "/img/gem/x/1", alt: "view 1" }],
  };

  it("accepts a complete stone and defaults it to unpublished", () => {
    const parsed = gemInputSchema.safeParse(valid);
    assert.ok(parsed.success);
    assert.equal(parsed.data.published, false);
    assert.equal(parsed.data.status, "available");
    assert.equal(parsed.data.priceRupees, null, "a blank price means price on request");
  });

  it("requires a treatment disclosure", () => {
    const parsed = gemInputSchema.safeParse({ ...valid, treatment: "" });
    assert.equal(parsed.success, false);
  });

  it("requires at least one image", () => {
    assert.equal(gemInputSchema.safeParse({ ...valid, images: [] }).success, false);
  });

  it("rejects a slug that is not URL safe", () => {
    assert.equal(gemInputSchema.safeParse({ ...valid, slug: "Not A Slug!" }).success, false);
  });

  it("rejects a negative carat weight", () => {
    assert.equal(gemInputSchema.safeParse({ ...valid, caratWeight: -1 }).success, false);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit and then refuses within the window", () => {
    resetRateLimits();
    for (let i = 0; i < 5; i += 1) {
      assert.equal(rateLimit("key", 5, 60_000).ok, true, `attempt ${i + 1} should pass`);
    }
    const blocked = rateLimit("key", 5, 60_000);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  it("counts each key separately", () => {
    resetRateLimits();
    assert.equal(rateLimit("a", 1, 60_000).ok, true);
    assert.equal(rateLimit("a", 1, 60_000).ok, false);
    assert.equal(rateLimit("b", 1, 60_000).ok, true);
  });
});
