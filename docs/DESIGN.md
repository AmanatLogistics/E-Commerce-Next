# Design direction — Karakoram Gems

**Direction name: "Tray and Loupe".**

One rule governs the whole system: **the interface is achromatic, so the stones are the
only saturated colour on any page.** Greys, warm ivory and a single restrained gold are all
the UI gets. A gem shop that puts a brand colour next to a vivid red spinel is competing
with its own product; a jeweller puts the stone on a plain dark tray for exactly this
reason, and the image plate here is that tray, in both light and dark themes.

Everything else follows from it. Cards are quiet. Badges are washes, not blocks. Gold
appears on the primary action and nowhere it would sit beside a photograph.

## Palette

### Light — "gallery"

| Token | Hex | Role |
|---|---|---|
| `--surface` | `#FFFFFF` | Page and card ground |
| `--surface-sunken` | `#F1F3F4` | Recessed panels, table zebra. A cool grey, deliberately not a warm cream |
| `--tray` | `#1A1E21` | The plate every stone photograph sits on — dark in **both** themes |
| `--ink` | `#16191C` | Primary text |
| `--ink-muted` | `#5A6169` | Secondary text, spec labels |
| `--line` | `#DDE1E4` | Hairline borders — the main separation device |
| `--accent` | `#8A6D12` | Antique gold. Primary action, active state, links on hover |
| `--success` | `#1F7A4C` | Available |
| `--danger` | `#B3261E` | Errors, destructive, failed delivery |

### Dark — the design's home ground

| Token | Hex |
|---|---|
| `--surface` | `#14171A` |
| `--surface-sunken` | `#0F1214` |
| `--tray` | `#0D1012` |
| `--ink` | `#ECE7DF` (warm ivory on a cool ground — the candlelit-case effect) |
| `--ink-muted` | `#9AA0A6` |
| `--line` | `#2C3238` |
| `--accent` | `#C9A227` |
| `--success` | `#4E9A6A` |
| `--danger` | `#D96A5E` |

Contrast: white on `--accent` `#8A6D12` ≈ 5.2:1 and `--ink` on `--surface` ≈ 16:1, both past
WCAG AA. Gold is never used as small text on white — it is a button ground or a hover state.

## Typography

- **Cormorant Garamond** — stone names, headings, the display line. A high-contrast old-style
  serif: fine hairlines against heavy stems, which is the same visual event as light through
  a faceted stone. Used 500/600.
- **IBM Plex Sans** — body, spec tables, forms, the entire admin panel. It is here for one
  functional reason: **true tabular figures**. This catalogue is columns of carat weights and
  millimetre dimensions, and `2.14` must sit under `12.60` on the decimal. Used 400/500/600.

The two are unalike in skeleton, not just in weight, so a heading never reads as bolded body
text. The admin panel uses Plex for its chrome as well — it is a working tool, and the serif
belongs to the shop window.

### Scale

Fluid via `clamp()` between 360px and 1440px.

| Token | Size | Line-height | Use |
|---|---|---|---|
| `--text-display` | clamp(2rem, 1.3rem + 3vw, 3.5rem) | 1.05 | Home statement |
| `--text-h1` | clamp(1.625rem, 1.2rem + 1.8vw, 2.5rem) | 1.12 | Page and stone titles |
| `--text-h2` | clamp(1.3rem, 1.1rem + 0.9vw, 1.75rem) | 1.2 | Section |
| `--text-h3` | 1.1875rem | 1.3 | Card and block titles |
| `--text-body` | 0.9375rem | 1.6 | Default |
| `--text-sm` | 0.8125rem | 1.5 | Meta |
| `--text-xs` | 0.6875rem | 1.4 | Chips, spec labels |

**One tracked-out small-caps style exists**, `.label-caps`, and it is confined to spec-table
row labels and section eyebrows in the admin, where it does real work separating label from
value in a dense two-column list. It is not used decoratively above headings.

## Spacing, radius, elevation, grid

**Spacing** — 4px base: `--space-1` 4 … `--space-8` 64. Nothing off-scale.

**Radius** — small and differentiated, so radius encodes what a thing is. A stone card is a
plate, not a pill. `--radius-sm` 2px (chips), `--radius-md` 4px (buttons, inputs, cards),
`--radius-lg` 8px (modals), `--radius-full` (avatars only).

**Elevation** — shadow is reserved for things that genuinely float; everything else separates
with `--line`.
- Level 0 — cards, panels, the gem grid: no shadow, 1px border.
- Level 1 — dropdowns, popovers.
- Level 2 — modals.

**Gem grid** — deliberately *less* dense than a marketplace. Each stone is a unique object and
the photograph is the product, so cards get room to breathe.

| Breakpoint | Columns | Gutter |
|---|---|---|
| 360–479px | 1 | 16px |
| 480–899px | 2 | 16px |
| 900–1279px | 3 | 24px |
| 1280px+ | 4 | 24px |

## Self-critique — what a generic brief would have produced

**Palette.** My first pass was the obvious luxury move: near-black, warm ivory, gold accent
used generously — on headings, rules, hovers and borders. That is what any "premium" brief
produces, and here it actively fights the product, because gold sits inside the same warm
hue range as citrine, topaz and amber. Changed to a hard rule: the UI is achromatic and gold
is confined to the primary action. The stones then have the colour space to themselves,
which is the one thing this shop actually needs.

**Type.** Cormorant Garamond is a common luxury pick and I am not pretending otherwise. It
stayed because the justification is functional rather than atmospheric — high stroke
contrast beside faceted material — and because the pairing does the real work: every
*factual* thing on the site is set in Plex for its tabular figures. The serif never touches
a number in a table.

**Layout.** My first pass reused the dense marketplace grid from an earlier iteration of
this project: five columns, tight gutters, small cards. That is right for forty phones and
wrong for twenty-three unique stones — it makes a curated inventory look like clearance
stock, and it shrinks the photograph, which is the product. Changed to a four-up maximum
and one column at 360px.

**Home page.** I had a hero banner with a large photograph. Cut: a stone photographed at
banner size is a texture, not a stone, and it pushed actual inventory below the fold. The
page now opens with a short plain statement and goes straight to selected stones.

## Hard constraints — how each is honoured

- **No warm-cream + high-contrast serif + terracotta.** There is a serif, but the ground is
  cool white `#F1F3F4` or near-black, and there is no terracotta anywhere.
- **No accent near `#D97757`.** The only warm colour is `#8A6D12` / `#C9A227`, a dark gold
  at roughly 45° hue against that colour's ≈16°, and far less saturated. Checked, not assumed.
- **No purple/violet gradient.** There are no gradients in the system at all.
- **No Inter everywhere.** Neither face is Inter.
- **No black with one acid accent.** The dark ground is `#14171A`, and antique gold is the
  opposite of an acid accent.
- **No untouched component library.** Radix supplies unstyled behaviour only (dropdown,
  dialog); every visual property is ours.
- **No tracked-out ALL-CAPS eyebrows above headings** — the one small-caps style is scoped
  to data labels, as described above.
- **No "→" glued to button text.** Button labels are plain verbs.
- **No meta strings joined with middle dots.** Meta is a real table or real spacing.
- **No identical rounded cards with the same soft shadow.** See radius and elevation above.
