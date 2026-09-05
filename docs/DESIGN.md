# Design direction — Afghan Emerald Crest

**Direction name: "Emerald & Ivory".**

The register is a contemporary fine-jewellery storefront. That is a deliberate change from
this project's first design, which was austere and achromatic; the client saw it and wanted
the warmer, more commercial language that direct-to-consumer jewellery brands use, and they
were right — an austere grid reads as a mineral archive, not as a shop where someone is
about to spend a large sum on something they cannot hold.

The name sets the palette. **Deep emerald** is the brand and carries every primary action.
**Warm ivory** is the ground, because a cool grey makes gemstones look like specimens under
lab light and a warm one makes them look like merchandise. **Gold** appears only as
emphasis: the crest, the short rule under a section heading, the focus ring. Photography
sits on a **pale plate** rather than a dark tray — the reverse of the earlier design, and the
single change that does most to move the page from museum to shop.

## Palette

### Light — the primary look

| Token | Hex | Role |
|---|---|---|
| `--surface-sunken` | `#FAF7F2` | Warm ivory. The page ground |
| `--surface` | `#FFFFFF` | Cards, panels, raised sections |
| `--plate` | `#F2EDE4` | The pale panel every stone photograph sits on |
| `--brand` | `#0B4F3A` | Deep emerald. Primary action, header bar, footer, active state |
| `--gold` | `#B08D45` | Emphasis only: crest, section rule, focus ring |
| `--ink` | `#1C1A17` | Primary text, warm near-black |
| `--ink-muted` | `#6B6459` | Secondary text, spec labels |
| `--line` / `--line-strong` | `#E5DED2` / `#D3C9B8` | Hairlines; the stronger one for form controls |
| `--success` | `#1F7A4C` | Available |
| `--danger` | `#A32B20` | Errors, destructive |

### Dark

The dark theme keeps the same structure with the emerald and gold lifted for contrast:
`--surface #14171A`, `--plate #1E2326`, `--brand #4FAE8B`, `--gold #D3AD5F`,
`--ink #EFE9DE`, `--ink-muted #A49C8F`, `--line #2B3033`.

Contrast: white on `--brand` ≈ 9.6:1 and `--ink` on `--surface-sunken` ≈ 15:1, both well past
WCAG AA. Gold is never small text on ivory — it is the crest, a 1px rule, and a focus ring.
`/styleguide` prints every measured ratio.

## Typography

- **Cormorant Garamond** — the wordmark, stone names, headings. A high-contrast old-style
  serif is the register fine jewellery is sold in, and its fine hairlines sit naturally
  beside faceted material. 400/500/600.
- **Jost** — body, spec tables, navigation, buttons, the entire admin panel. A geometric
  sans keeps a data-dense table readable under an ornate heading, and it holds the wide
  letter-spacing the category uses for small labels without falling apart. 300–600.

The pairing has a rule: **the serif never sets a number in a table.** Carat weights,
millimetre dimensions and prices are all Jost with `tabular-nums`, so columns align.

### Scale

| Token | Size | Use |
|---|---|---|
| `--text-display` | clamp(2.25rem → 4rem) | Home hero |
| `--text-h1` | clamp(1.75rem → 2.75rem) | Page and stone titles |
| `--text-h2` | clamp(1.375rem → 2rem) | Section headings |
| `--text-h3` | 1.25rem | Card titles, blocks |
| `--text-body` | 0.9375rem | Default |
| `--text-sm` / `--text-xs` | 0.8125 / 0.6875rem | Meta; labels |

**`.label-caps`** — uppercase, `0.16em` tracking. The category's signature small label, used
for eyebrows, spec-table labels, navigation and buttons. This is the one place wide tracked
capitals belong, and it is deliberate rather than decorative.

**`.crest-rule`** — a 2.5rem gold hairline under a section heading. The only ornament in the
system. Used on section headings and nowhere else.

## Spacing, radius, elevation, grid

**Spacing** — 4px base, `--space-1` 4 … `--space-9` 96.

**Radius** — `--radius-sm` 2px (badges), `--radius-md` 4px (buttons, inputs),
`--radius-lg` 10px (cards, image plates, panels). Jewellery retail is not a pill-shaped
category; nothing is fully rounded except an avatar.

**Elevation** — warm and very soft, never a hard grey drop. Level 1 for floating layers,
level 2 for modals. Cards use a hairline border, not a shadow.

**Product grid** — 2-up on a phone, as the category does, then 3 and 4.

| Breakpoint | Columns | Gutter |
|---|---|---|
| 360–639px | 2 | 12px |
| 640–1099px | 3 | 24px |
| 1100px+ | 4 | 32px |

## Patterns taken from the category

Conventions this build adopts deliberately, having looked at how jewellery storefronts are
structured (see `docs/RESEARCH.md` for what was and was not reachable):

- **An announcement bar** of promises above the header — the things a buyer needs to believe
  before enquiring on a stone they cannot hold.
- **A centred wordmark** over a variety rail, so the brand reads before the navigation.
- **A hero that is one stone**, not a banner collage, with the type against a wide margin.
- **Cards that swap to a second view on hover**, with one corner badge at most. Stacking
  three badges is how a grid starts to look like a sale bin.
- **Centred section headings** with an eyebrow and a crest rule.
- **A trust strip** above the footer, and an emerald footer that closes the page.

## Self-critique

**What the first design got wrong.** It was internally consistent and I still think the
argument was sound — an achromatic UI so the stones are the only colour. But it optimised
for a photographer's judgement of the stone and ignored what the page is for, which is to
make someone confident enough to start a conversation about money. Dark grey and hairlines
do not do that. The lesson is not "the palette was wrong", it is that I picked a rule and
followed it past the point where it served the buyer.

**What I would still guard against here.** The obvious failure mode of this direction is
generic luxury: cream, a serif, gold everywhere, and nothing that says which shop this is.
Three rules hold it back from that — gold is confined to the crest, the rule and the focus
ring; the serif never sets a number; and the emerald is a real brand colour doing real work
on buttons and the footer rather than an accent sprinkled around. The category cards, the
spec table and the enquiry panel are all plain by design so the stones carry the page.

**Still deliberately absent.** No gradient hero, no ALL-CAPS eyebrow above *every* heading
(only where a section needs one), no "→" glued to button text, no meta strings joined with
middle dots, and no identical drop shadow on every card regardless of hierarchy.
