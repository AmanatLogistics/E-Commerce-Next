# Research — Afghan Emerald Crest

> The business is **Afghan Emerald Crest**. It is defined in exactly one place,
> `lib/site-config.ts`, so renaming it is a one-line change.

## A. How loose-gemstone dealers actually sell

This is not a general e-commerce store, and building it like one would have been wrong.
Reading through established dealers (links at the bottom), four structural facts drive the
whole design:

| Fact | Consequence for this build |
|---|---|
| **A stone is one of a kind.** There is one 2.14 ct Swat emerald, not forty in stock. | No quantity, no stock count, no basket. A stone is `available`, `reserved` or `sold`. |
| **Higher-value stones are priced on request.** Dealers quote per stone, per buyer, often after a video call or a viewing. | `priceMinor` is nullable and "Price on request" is a first-class rendered state, not a missing value. |
| **The sale starts as a conversation.** The buyer asks about certification, video, viewing, shipping; the dealer replies personally. | The enquiry form replaces cart, checkout, payment and orders entirely. There is no customer account, because there is nothing for a buyer to log into. |
| **Buyers compare on a fixed set of attributes.** | The specification table is the product page. Carat, shape, cut, colour, clarity, L×W×D, origin, treatment, certificate. |

### The attributes that matter, and why

From published guidance on gem certification and grading:

- **The four Cs** — colour (hue, saturation, tone), clarity, cut, carat weight.
- **Clarity** is graded FL, IF, VVS, VS, SI, I. For emerald in particular, visible inclusions
  are normal and not a defect at a given quality level, which is why the copy says so.
- **Dimensions** are quoted as length × width × depth in millimetres (e.g. 9.05 × 7.20 ×
  5.10 mm). Two stones of the same carat weight can be very different sizes face-up, so the
  measurements are not decoration.
- **Treatment disclosure is a trade obligation.** Heating, oiling and irradiation all change
  value materially. "No evidence of heat" is itself a selling point and commands a premium.
- **Origin** is determinable for many coloured stones and is part of what a report certifies.
- Recognised labs include **GIA, IGI, AIGS, SSEF and Gübelin**.

Three of these turned into hard rules in the code:

1. `treatment` is a **required, non-empty** field on every stone (`lib/validation/schemas.ts`).
   There is no way to publish a stone without stating its treatment, including when there is
   none. The spec table always renders the row.
2. "Untreated" is surfaced as a **filter** and a **badge**, because it is a real buying
   criterion rather than a footnote.
3. A stone with no price shows **"Price on request"** and its JSON-LD asserts **no price** —
   a structured-data price on an unpriced stone would be a fabrication.

## B. Why the catalogue is Afghan material

The shop is based in the Panjshir valley and prices in afghanis, and Afghanistan is a
genuine source for everything it sells. The demo catalogue is built from documented deposits
rather than invented ones:

| Variety | Locality | Note |
|---|---|---|
| Emerald | Panjshir valley — Khenj, Mikeni, Buzmal | Talc-carbonate schist; mined in earnest since the 1970s |
| Ruby | Jegdalek, east of Kabul | Gem corundum in marble beds |
| Spinel | Badakhshan, and the Jegdalek marbles | Clean pink and red, almost always untreated |
| Aquamarine | Paprok (Nuristan), Chapa Dara (Kunar) | Among the finest documented material anywhere |
| Topaz | Mawi and Nilaw, Laghman | Sherry, pale blue and water-clear, often in large clean crystals |
| Tourmaline | Paprok, Mawi, Nilaw | Greens, pinks and bicolours from pegmatites |
| Peridot | Pech valley, Kunar | Large, clean crystals with a strong green |

One deliberate omission: the earlier Pakistani catalogue led with Katlang baby-pink topaz,
and there is no Afghan equivalent. Rather than move the name across and quietly imply a
colour these pegmatites do not produce, the topaz entries are the sherry and pale blue that
Laghman actually yields. Undisclosed provenance is the one thing this shop's own listings
promise never to do.

**The localities, varieties and typical treatments are real. The individual stones are
not** — weights, dimensions, references and prices are invented demonstration stock. That
distinction is stated in `scripts/catalogue.ts` too, so nobody later mistakes the seed data
for a valuation.

## C. UX rules carried over

The published cart-and-checkout research does not apply to a store with no checkout, but
several of its findings survive the translation:

| Rule | Where |
|---|---|
| Never force an account on a buyer. Here that is absolute: there is no buyer account at all. | No signup route exists |
| Show the total cost of engaging before the last step — here, be explicit that nothing is charged and no account is created. | Under the enquiry form, and in the footer |
| Top-aligned persistent labels, never a placeholder used as a label. | `components/ui/field.tsx` |
| Correct mobile keyboards: `type="email"`, `inputmode="tel"`, real `autocomplete` tokens. | Enquiry and contact forms |
| Minimal visible fields. The enquiry asks four things, one of which is optional. | `enquiry-form.tsx` |
| Gallery: manual navigation, visible thumbnails not dots, and zoom. | `components/gem/gallery.tsx` |
| Search and filter state in the URL, so a result is shareable and survives Back. | `lib/browse-params.ts` |
| An empty result is a useful screen with real next actions, never a dead end. | `/collection` empty state |

## C2. Visual reference

The client pointed at a direct-to-consumer jewellery storefront (vibella.com) as the look
they wanted. **That page could not be fetched from this environment — it is blocked by the
egress proxy, as was angara.com** — so the direction in `docs/DESIGN.md` is built from the
category conventions that could be verified in published write-ups plus general knowledge of
how these storefronts are put together, not from reading that specific site. The patterns
adopted are the ones these write-ups agree on:

- Elegant serif headings against generous white space, with a neutral palette of ivory,
  black, gold and one brand colour.
- A promise/announcement bar above the header.
- Large product photography on a pale ground, with a second view on hover.
- Clean category navigation and a product grid that goes 2-up on a phone.
- Product zoom to inspect a stone, and macro imagery showing clarity.

If any of this misses what the client actually liked about that site, it is worth a look at
it together — the direction is one file of tokens and would not be expensive to shift.

## D. Stack decision

**Next.js 16.3.3 (App Router), not Astro.** Verified with `npm view next version`.

The public catalogue is content-shaped and would suit Astro, but the admin panel is not:
it is authenticated, stateful CRUD on every route, and the enquiry flow is a server-side
mutation that writes to a database and sends mail. The App Router covers both in one
application — Server Components read the database directly, Server Actions handle the
mutations with the role re-checked inside each one, and `proxy.ts` guards `/admin` at the
edge. With Astro this would mean a separate API layer for the mutations and hand-declared
hydration boundaries, which trades away the thing Astro is good at.

## Sources

- [The Rare Gemstone Company](https://www.theraregemstonecompany.com/) — loose-stone catalogue structure
- [GemSelect](https://www.gemselect.com/) — attribute-led listings across 130+ varieties
- [Gandhara Gems](https://gandharagems.com/collections/loose-gemstones) — a Pakistan-based dealer's catalogue
- [Guide to gemstone certifications — Jewelers Mutual](https://www.jewelersmutual.com/resources/individuals/colored-gemstones/guide-to-gemstone-certifications)
- [How to read a gem certificate](https://sosnagems.com/blogs/gemstone-guides/how-to-read-a-gem-certificate)
- [IGI — grading reports](https://www.igi.org/)

### On the deposit sources

The four links that backed the deposit table were about **Pakistani** localities — Swat,
Hunza, Katlang, Kohistan — and stopped being sources for anything here when the shop moved
to Afghanistan. They have been removed rather than left standing as citations for a table
they no longer support.

The Afghan localities that replaced them — Panjshir (Khenj, Mikeni, Buzmal), Jegdalek,
Badakhshan, Paprok and Chapa Dara, Mawi and Nilaw, the Pech valley — are well documented in
the gemmological literature, but they were written from general knowledge: outbound access
to reference sites is blocked in the environment this repo is worked in, so nothing was
re-verified against a source, and no source is cited here that was not actually read. Treat
the table as a starting point to check before it goes near a real listing.

- [Baymard Institute — cart & checkout usability research](https://baymard.com/research/checkout-usability)
- [Best jewelry website design examples — Colorlib](https://colorlib.com/wp/jewelry-website-design/)
- [Jewelry website design examples — Muffin Group](https://muffingroup.com/blog/jewelry-website-designs/)
- [Why jewelry brands need luxury website design — Wings](https://wings.design/insights/why-every-jewelry-brand-needs-a-luxury-website-design)

Version facts came from `npm view <pkg> version` run in this repo, not from memory.
