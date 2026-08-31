# Design direction — Chowk

**Direction name: "Blueprint & Brass".**

The catalogue has two halves that usually fight each other: engineered goods (phones,
audio, appliances) and domestic goods (kitchen, textiles, lighting). The system gives each
half a colour job. **Petrol blue** is the technical, structural, load-bearing colour — it
carries navigation, actions, and every piece of chrome. **Brass-yellow** is the warm,
human, commercial colour — it carries price, discount, and urgency, and it appears nowhere
else. Two colours, two jobs, no decoration. The result reads like a well-printed parts
catalogue rather than a lifestyle boutique, which is the honest register for a marketplace
selling a rice cooker next to a mid-range phone.

## Palette

Six named roles. Every value is a token in `app/globals.css`; components never hardcode a hex.

### Light

| Token | Hex | Role |
|---|---|---|
| `--surface` | `#FFFFFF` | Page and card ground |
| `--surface-sunken` | `#EBEFF1` | Recessed panels, image plates, table zebra |
| `--ink` | `#0B1A24` | Primary text. Blue-cast near-black, never pure `#000` |
| `--ink-muted` | `#4A5B66` | Secondary text, meta, spec labels |
| `--line` | `#D3DCE1` | Hairline borders — the only separation device we use |
| `--primary` | `#0E5A74` | Petrol blue. Actions, links, focus, active nav |
| `--primary-hover` | `#0A4457` | Action hover/active |
| `--accent` | `#E8A200` | Brass. Price urgency, discount chips, deals strip **only** |
| `--success` | `#1B7A4B` | In stock, order delivered |
| `--danger` | `#B3261E` | Errors, destructive, out of stock |

### Dark

| Token | Hex |
|---|---|
| `--surface` | `#0B1418` |
| `--surface-sunken` | `#111E24` |
| `--ink` | `#E6EDF0` |
| `--ink-muted` | `#9CB0BA` |
| `--line` | `#24343C` |
| `--primary` | `#3FA0C4` |
| `--primary-hover` | `#5FB6D6` |
| `--accent` | `#F5B93A` |
| `--success` | `#3FB37C` |
| `--danger` | `#E4675E` |

Contrast: white on `--primary` `#0E5A74` ≈ 6.0:1 and `--ink` on `--surface` ≈ 17:1, both
past WCAG AA. `--accent` is never used as text on white — it is a chip **background** with
`--ink` on top (≈ 9:1). Verified with the ratio calculation in `/styleguide`, which prints
the measured number next to each pair rather than asserting compliance.

## Typography

Two faces, deliberately unalike in skeleton, not just in weight.

- **Archivo** — headings, product titles, buttons, numerals in the price block.
  A grotesque with a tall x-height and a wide weight axis that stays legible when a product
  title is squeezed into two lines in a 5-up grid. Used 500/600/700.
- **IBM Plex Sans** — body, specs, forms, tables. Drawn for technical documentation, and
  the reason it is here: it has **true tabular figures**, so price columns, quantities, and
  order totals align on the decimal without manual spacing. Used 400/500/600.

Both are loaded through `next/font/google` with `display: swap` and a real fallback stack.
Prices, quantities, and any numeric table column set `font-variant-numeric: tabular-nums`.

### Scale

Fluid via `clamp()` between 360px and 1440px.

| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `--text-display` | clamp(1.75rem, 1.2rem + 2.2vw, 2.75rem) | 1.08 | 700 | Page hero |
| `--text-h1` | clamp(1.5rem, 1.15rem + 1.4vw, 2.125rem) | 1.15 | 700 | Page title |
| `--text-h2` | clamp(1.25rem, 1.05rem + 0.8vw, 1.5rem) | 1.2 | 600 | Section |
| `--text-h3` | 1.125rem | 1.3 | 600 | Card/blocks |
| `--text-body` | 0.9375rem | 1.55 | 400 | Default |
| `--text-sm` | 0.8125rem | 1.45 | 400 | Meta, specs |
| `--text-xs` | 0.6875rem | 1.4 | 500 | Chips, badges |

## Spacing, radius, elevation, grid

**Spacing** — 4px base: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48,
`-8` 64. Nothing off-scale.

**Radius** — deliberately small and *differentiated*, so radius encodes what a thing is:
`--radius-sm` 3px (chips, badges), `--radius-md` 6px (buttons, inputs, cards),
`--radius-lg` 10px (modals, sheets), `--radius-full` 999px (avatars only).

**Elevation** — shadow is reserved for things that genuinely float. Everything else
separates with `--line`.
- Level 0 — cards, panels, the product grid: **no shadow**, 1px `--line` border.
- Level 1 — dropdowns, popovers: `0 2px 8px -2px rgb(11 26 36 / 0.14)`.
- Level 2 — modals, mobile filter sheet: `0 12px 32px -8px rgb(11 26 36 / 0.24)`.

**Product grid** — density is the point.

| Breakpoint | Columns | Gutter |
|---|---|---|
| 360–599px | 2 | 8px |
| 600–899px | 3 | 12px |
| 900–1279px | 4 | 12px |
| 1280px+ | 5 | 16px |

Two columns at 360px, not one: a marketplace shopper scans and compares, and a single
full-width card per row makes a 40-product category feel like an endless scroll.

## Self-critique — what a generic brief would have produced, and what changed

Required by the brief. Each item is a thing I actually had before revising.

**Palette.** My first pass was a deep teal primary with an amber accent. That is what I
would produce for *any* store brief — teal is the safe "not-blue blue" and it carries no
information about what is being sold. Changed to petrol blue + brass with an explicit rule
that each colour owns one job (structure vs. commerce), and accent is **banned outside
price and discount**. That rule is what makes the palette specific: on a product page, the
only warm thing on screen is the price, which is what the page is for.

**Type.** My first pass was Space Grotesk for headings. In 2026 that is the default
"technical-looking" font — it is what a generic brief produces when it wants to signal
engineering. Changed to Archivo, chosen on a functional argument rather than a vibe: it
holds a two-line product title at 14px in a 5-up grid without turning to mush. IBM Plex Sans
stayed, but the justification was rewritten from "technical feel" to the actual reason —
tabular figures for price alignment, which is a real requirement of a price-dense catalogue.

**Layout.** My first pass was a 3-up product grid with generous cards. That is a boutique
layout and it lies about the catalogue: it says "we have twelve carefully chosen things"
when we have forty and want to sell breadth. Changed to 5-up at desktop, 2-up at 360px,
tight gutters, no card shadows. Also cut a full-bleed hero banner — it pushed product below
the fold on a page whose job is to show product.

**Radius/elevation.** First pass gave everything the same 8px radius and the same soft
shadow. That is the "identical rounded cards" tell. Changed so radius encodes object type
and shadow is reserved for genuinely floating layers; flat things separate with a hairline.

## Hard constraints — how each is honoured

- **No warm-cream + high-contrast serif + terracotta.** Ground is white/cool grey
  (`#EBEFF1`), both faces are sans, and there is no terracotta in the system.
- **No accent near `#D97757`.** The only warm colour is `#E8A200`, a saturated brass-yellow.
  It differs from `#D97757` in hue (≈42° vs ≈16°) and in saturation; it is not a muted
  salmon. Checked deliberately, not assumed.
- **No Daraz orange.** `#F85606` is a red-orange; nothing in this palette is in that region.
- **No purple/violet gradient hero.** There is no gradient anywhere in the system, and no
  hero banner at all on the home page.
- **No Inter-everywhere.** Neither face is Inter.
- **No black + one acid accent.** Ground is white; the darkest ink is a blue-cast `#0B1A24`.
- **No untouched shadcn.** No component library is installed. Radix *unstyled* primitives
  provide behaviour only (dialog, dropdown, accordion, label); every visual property comes
  from our tokens.
- **No tracked-out ALL-CAPS eyebrows** above headings — there are none in the system.
- **No "→" glued to button text.** Button labels are plain verbs.
- **No middle-dot meta strings.** Meta is laid out with real spacing, or a table.
- **No identical cards with the same `rgba(0,0,0,.1)` shadow.** See elevation above.
