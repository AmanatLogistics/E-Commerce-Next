import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { whatsappLink } from "../../lib/whatsapp";

/**
 * wa.me wants digits and nothing else. A number with a plus, spaces or dashes in it produces
 * a link that looks fine, renders fine, and lands the buyer on "this number is invalid" —
 * the kind of failure nobody catches by looking at the page.
 */

describe("the WhatsApp link", () => {
  it("strips everything that is not a digit", () => {
    const link = whatsappLink("+93 70 280 0277");
    assert.equal(link?.digits, "93702800277");
    assert.equal(link?.href, "https://wa.me/93702800277");
  });

  it("accepts the same number written any of the usual ways", () => {
    for (const written of [
      "+93 70 280 0277",
      "+93-70-280-0277",
      "0093 70 280 0277",
      "(+93) 70 280 0277",
      "93702800277",
    ]) {
      assert.equal(whatsappLink(written)?.digits, "93702800277", written);
    }
  });

  it("drops a national trunk zero, which is not part of the international number", () => {
    assert.equal(whatsappLink("093 70 280 0277")?.digits, "93702800277");
  });

  it("encodes a prefilled message rather than pasting it in raw", () => {
    const link = whatsappLink("+93 70 280 0277", "Hello, I saw stone AEC-EM-0101 & liked it");
    assert.ok(link);
    assert.match(link.href, /\?text=/);
    // A raw & would truncate the message at the query-string boundary.
    assert.equal(link.href.includes("& liked"), false);
    assert.ok(link.href.includes("AEC-EM-0101"));
  });

  it("returns nothing at all when there is no usable number", () => {
    // Empty is how the button is switched off; the rest are typos, not numbers.
    assert.equal(whatsappLink(""), null);
    assert.equal(whatsappLink("   "), null);
    assert.equal(whatsappLink("+93 70"), null);
    assert.equal(whatsappLink("not a number"), null);
    assert.equal(whatsappLink("1".repeat(16)), null);
  });

  it("leaves the query off entirely when there is no message", () => {
    assert.equal(whatsappLink("+93 70 280 0277", "   ")?.href, "https://wa.me/93702800277");
  });
});
