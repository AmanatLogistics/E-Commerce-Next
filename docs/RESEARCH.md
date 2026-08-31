# Research — Karakoram Gems

> Working store name is **Karakoram Gems**, after the range that most of these stones come
> out of. It is defined in exactly one place, `lib/site-config.ts`, so renaming the business
> is a one-line change.

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

## B. Why the catalogue is Pakistani material

The currency and locale are PKR / en-PK, and Pakistan is a genuine source for most of what
this shop sells. The demo catalogue is built from documented deposits rather than invented
ones:

| Variety | Locality | Note |
|---|---|---|
| Emerald | Swat valley, above Mingora | Found in 1958; occurs in talc schist |
| Ruby & spinel | Hunza valley | Gem corundum and spinel in marble beds |
| Aquamarine | Dassu / Skardu / Shigar, Gilgit-Baltistan | Among the finest documented material anywhere |
| Pink topaz | Katlang, near Mardan | The deposit that made baby-pink topaz known |
| Tourmaline | Gilgit, Shigar, Stak Nala | Greens, pinks and bicolours from pegmatites |
| Peridot | Sapat, Kohistan | Large, clean crystals with a strong green |

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
- [Gemstones of Pakistan: emerald, ruby and spinel — Gübelin, GIA (PDF)](https://www.gia.edu/doc/Gemstones-of-Pakistan-Emerald-Ruby-and-Spinel.pdf)
- [Gemstone of Pakistan — PGJDC](https://www.pgjdc.org/gnjdata.php?cId=61)
- [Province-by-province mining guide — Orah Jewels](https://orahjewels.com/blogs/journals/where-are-pakistans-gemstones-found-a-province-by-province-mining-location-guide)
- [Pakistan's gemstones and minerals — Gandhara Gems](https://gandharagems.com/blogs/blog/pakistan-s-gemstones-minerals-an-overview)
- [Baymard Institute — cart & checkout usability research](https://baymard.com/research/checkout-usability)

Version facts came from `npm view <pkg> version` run in this repo, not from memory.
