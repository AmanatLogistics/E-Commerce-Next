import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify, uniqueSlug } from "../../lib/slug";
import { checkImageSrc, isRemoteImage } from "../../lib/image-src";
import { gemInputSchema } from "../../lib/validation/schemas";

/**
 * The add-stone form used to refuse perfectly good listings, and these are the two reasons.
 *
 * A dealer typed the title into a field labelled "URL slug" — because that is what a slug
 * looks like once it exists — and got "Use lowercase words separated by hyphens". Then they
 * pasted an image address, left the description box alone, and got "Describe the image".
 * Neither message named a field they could see the point of, and neither save went through.
 */

describe("deriving the slug from the title", () => {
  it("turns a real stone title into an address", () => {
    assert.equal(slugify("Panjshir Emerald, Emerald Cut, 2.14 ct"), "panjshir-emerald-emerald-cut-2-14-ct");
    assert.equal(slugify("Jegdalek Ruby (untreated)"), "jegdalek-ruby-untreated");
  });

  it("folds accents rather than deleting the letters under them", () => {
    // "n-phrite" would be the result of stripping instead of folding.
    assert.equal(slugify("Néphrite"), "nephrite");
  });

  it("never ends up with stray or doubled hyphens", () => {
    assert.equal(slugify("  ***Emerald***  "), "emerald");
    assert.equal(slugify("A — B"), "a-b");
    assert.equal(slugify("x".repeat(200)).endsWith("-"), false);
  });

  it("settles a collision instead of reporting it", async () => {
    // Two stones can honestly share a title; it is a description, not a name.
    const taken = new Set(["panjshir-emerald", "panjshir-emerald-2"]);
    assert.equal(
      await uniqueSlug("Panjshir Emerald", async (c) => taken.has(c)),
      "panjshir-emerald-3",
    );
  });

  it("still produces something for a title with no usable characters", async () => {
    assert.equal(await uniqueSlug("!!!", async () => false), "stone");
  });
});

describe("image addresses", () => {
  it("accepts any host, because 'paste a link from anywhere' is the requirement", () => {
    for (const url of [
      "https://images.unsplash.com/photo-123",
      "http://some-suppliers-site.example/a/b.jpg",
      "https://lh3.googleusercontent.com/x?w=800",
    ]) {
      assert.equal(checkImageSrc(url).ok, true, url);
      assert.equal(isRemoteImage(url), true, url);
    }
  });

  it("accepts our own paths, and knows they are not remote", () => {
    const verdict = checkImageSrc("/media/6a9d1ac28b6df43e41b8d563.png");
    assert.equal(verdict.ok, true);
    assert.equal(isRemoteImage("/media/x.png"), false);
  });

  it("refuses the schemes that would execute rather than display", () => {
    // A src that runs code is stored XSS; this is the whole reason the check exists.
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pg==",
    ]) {
      assert.equal(checkImageSrc(url).ok, false, url);
    }
  });

  it("refuses a protocol-relative address pretending to be a path", () => {
    assert.equal(checkImageSrc("//evil.example/x.jpg").ok, false);
  });

  it("refuses what is plainly not a link", () => {
    assert.equal(checkImageSrc("").ok, false);
    assert.equal(checkImageSrc("emerald.jpg").ok, false);
  });
});

describe("the gem form's rules", () => {
  const valid = {
    title: "Panjshir Emerald 3 carat",
    reference: "AEC-EM-9001",
    description: "A green emerald from the Panjshir valley, clean and bright to the eye.",
    categoryId: "6a9bac0c52f35c183191e053",
    caratWeight: 3,
    shape: "Oval",
    colour: "Green",
    lengthMm: 9,
    widthMm: 7,
    depthMm: 5,
    origin: "Panjshir Valley, Afghanistan",
    treatment: "None (untreated)",
    images: [{ url: "https://images.example.com/a.jpg" }],
  };

  it("saves a listing with no slug, no cut, no clarity and no image description", () => {
    // Precisely the submission that used to be refused twice over.
    const parsed = gemInputSchema.safeParse(valid);
    assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
    assert.equal(parsed.data.cut, "");
    assert.equal(parsed.data.clarity, "");
    assert.equal(parsed.data.images[0].alt, "");
    assert.equal("slug" in parsed.data, false);
  });

  it("still insists on a treatment, which is a disclosure obligation", () => {
    const parsed = gemInputSchema.safeParse({ ...valid, treatment: "" });
    assert.equal(parsed.success, false);
  });

  it("still insists on at least one photograph", () => {
    assert.equal(gemInputSchema.safeParse({ ...valid, images: [] }).success, false);
  });

  it("refuses an image address that could execute", () => {
    const parsed = gemInputSchema.safeParse({
      ...valid,
      images: [{ url: "javascript:alert(document.cookie)" }],
    });
    assert.equal(parsed.success, false);
  });
});
