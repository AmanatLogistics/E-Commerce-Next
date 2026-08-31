# Research — Chowk

> Working store name is **Chowk** (Urdu/Punjabi: the town square / crossroads where a
> bazaar forms). It is a placeholder chosen so the build could proceed; it is defined in
> exactly one place, `lib/site-config.ts`, so renaming the store is a one-line change.
> Sells consumer electronics + home goods across 6 categories. Currency PKR, locale en-PK.

## A. UX research — the rules this build actually follows

Sourced from Baymard Institute's published cart/checkout and product-page research
(links at the bottom). Only rules that survive into code are listed; each names where it
is implemented so the claim is checkable.

### Checkout

| # | Rule | Evidence | Implemented in |
|---|------|----------|----------------|
| 1 | **Guest checkout is the single most prominent option** at the account step — larger button, higher placement, primary colour. Forced account creation is a top-three abandonment cause. | Baymard checkout research; guest checkout is routinely buried on mobile | `app/(shop)/checkout/_steps/account-step.tsx` |
| 2 | **Total cost including shipping is visible before the final step.** Unexpected extra cost is the single largest stated abandonment reason (~48% of abandonments). | Baymard cart & checkout usability | Order summary renders shipping + total from step 1 onward, `components/checkout/order-summary.tsx` |
| 3 | **Linear flow, no steps-inside-steps.** "Steps within steps" was the biggest single usability offender in the checkout study. | Baymard checkout usability report | Four flat steps, one URL each: `/checkout?step=account\|address\|payment\|review` |
| 4 | **Honest progress indicator** — shows every step, current position, and allows going back to a completed step only. | Baymard | `components/checkout/checkout-progress.tsx` |
| 5 | **Minimal visible fields**; optional fields hidden behind a disclosure rather than shown greyed. | Baymard form-usability | Address form asks 7 fields; "Address line 2" and "delivery notes" are disclosures |
| 6 | **Top-aligned persistent labels**, never placeholder-as-label (placeholders vanish on focus and destroy error recovery). | Baymard form usability | `components/ui/field.tsx` — label is always rendered above the control |
| 7 | **Correct mobile keyboard types.** `inputmode="numeric"` for postal code and phone, `type="email"`, `autocomplete` tokens on every field. | Baymard mobile checkout | `components/checkout/address-form.tsx` |
| 8 | **"Billing address same as shipping" checked by default.** The billing/shipping distinction is a known point of confusion. | Baymard | `address-form.tsx`, default `true` |

### Product page

| # | Rule | Implemented in |
|---|------|----------------|
| 9 | Gallery supports **manual navigation** — arrow buttons on desktop, horizontal swipe on mobile — not autoplay-only. | `components/product/gallery.tsx` |
| 10 | **Visible thumbnails**, not a dot indicator. Dots hide how many images exist and what they show. | `gallery.tsx` |
| 11 | **Zoom** on the active image. | `gallery.tsx` (click/tap to toggle 2× transform-origin zoom) |
| 12 | Price shows **strike-through original + saving** when discounted; stock state is explicit, never implied by a disabled button alone. | `components/product/price.tsx`, `stock-badge.tsx` |
| 13 | Quantity stepper is **bounded by real stock** and says so at the bound. | `components/product/qty-stepper.tsx` |
| 14 | A **specification table** — dense, scannable attributes — because electronics buyers compare on specs. | `app/(shop)/product/[slug]/page.tsx` |

### Search, category, navigation

| # | Rule | Implemented in |
|---|------|----------------|
| 15 | Search is **debounced** (250 ms) and never fires a request per keystroke. | `components/search/search-box.tsx` |
| 16 | The **empty state is a useful screen** — it restates the query, offers spelling help, and shows category entry points. It is never a dead end. | `components/search/empty-state.tsx` |
| 17 | **Sort and filter state lives in the URL**, so results are shareable, bookmarkable, and survive a back-navigation. | `lib/search-params.ts` |
| 18 | Pagination is **server-side**; the page number is in the URL. | `app/(shop)/search/page.tsx`, `category/[slug]/page.tsx` |
| 19 | Applied filters are shown as **removable chips** above the results, with a "clear all". | `components/search/active-filters.tsx` |

### Marketplace layout logic (structure borrowed, nothing else)

Large South Asian marketplaces (Daraz and peers) converge on a layout that works for a
dense, low-consideration catalogue. We take the **information architecture** only:

- A persistent **category rail** rather than a hover mega-menu — categories are the primary
  navigation for a broad catalogue.
- A **deals strip** directly under the fold with real discount percentages.
- **Dense product grids** — small cards, tight gutters, many products above the fold. Large
  airy cards are a boutique pattern and misrepresent a marketplace's breadth.
- An **information-heavy product page**: specs, stock, delivery expectation, all visible
  without interaction.

We deliberately take **none** of their visual language: not their colours, not their orange,
not their logo, not their typefaces, not their copy. See `DESIGN.md` for what we did instead.

## B. Visual references

Real shipped product, not concept art. Each line states the one thing being borrowed.

| # | Reference | Source | What we take |
|---|-----------|--------|--------------|
| 1 | Mobbin — e-commerce browse/filter flows | https://mobbin.com/browse/web/apps | Filter panel that stays docked on desktop and becomes a bottom sheet on mobile, rather than a full-page interstitial |
| 2 | Mobbin — checkout flows | https://mobbin.com/browse/web/apps | Sticky order-summary column on desktop; collapsible summary pinned to the top on mobile |
| 3 | Land-book — commerce category | https://land-book.com/ | Density decision: a 5-up grid at ≥1280px reads as a marketplace; 3-up reads as a boutique |
| 4 | SiteInspire — e-commerce filter | https://www.siteinspire.com/websites?categories=17 | Card treatment: image on a flat tinted panel, no drop shadow, hairline border only |
| 5 | Commerce Cream | https://commercecream.com/ | Price hierarchy: current price large and heavy, original struck through and de-emphasised beside it, saving as a small solid chip |
| 6 | Typewolf | https://www.typewolf.com/ | Type pairing method — a mono-derived grotesque for headings against a humanist text face for body |
| 7 | Fonts in Use — technical/catalogue | https://fontsinuse.com/ | Tabular figures in price columns; catalogue typography leans on figure alignment, not weight |
| 8 | IBM Plex specimen | https://www.ibm.com/plex/ | Plex Sans' true tabular figures and its performance at 12–14px in dense tables |

## C. Stack decision

**Next.js 16.3.3 (App Router), not Astro.**

Verified today with `npm view next version` → `16.3.3`; React `19.2.8`.

Every meaningful route in this app is authenticated, stateful, or personalised — cart,
session, checkout, order state, and the whole `/admin` CRUD surface. That is precisely the
App Router's case: Server Components read Mongo directly, Server Actions mutate with a
server-side session and role check on every call, and `middleware.ts` guards `/admin` at
the edge. Astro's islands model optimises for content-first pages that ship zero JS by
default; here we would be hand-declaring hydration boundaries on nearly every component and
bolting on a separate API layer for the mutations, which trades away the exact thing Astro
is good at while adding work.

## Sources

- [E-Commerce Checkout Usability report — Baymard](https://baymard.com/blog/ecommerce-checkout-usability-report)
- [Cart & Checkout Usability research — Baymard](https://baymard.com/research/checkout-usability)
- [Checkout optimization / abandonment reasons — Baymard report PDF](https://m.media-amazon.com/images/G/02/amazonservices/payments/website/Baymard_Report_Final._CB512367315_.pdf)
- [Key takeaways from Baymard's checkout study — Linnworks](https://www.linnworks.com/blog/the-key-takeaways-from-baymard-institutes-e-commerce-checkout-usability-study/)
- [Best auth library for Next.js in 2026 — LogRocket](https://blog.logrocket.com/best-auth-library-nextjs-2026/)
- [Better Auth vs Clerk vs Auth.js — buildmvpfast](https://www.buildmvpfast.com/blog/better-auth-vs-clerk-vs-authjs-nextjs-decision-tree-2026)

Version facts in this document came from `npm view <pkg> version` run in this repo, not from
memory. UX percentages are attributed to Baymard above and are not restated as our own.
