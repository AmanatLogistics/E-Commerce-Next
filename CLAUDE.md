# Project: Karakoram Gems

A loose-gemstone dealer's site: public catalogue + private admin panel. PKR / en-PK.
Business name lives in `lib/site-config.ts` only.

**Buyers enquire; they do not check out.** There is no cart, no checkout, no payment, no
order and no customer account. A stone is one of a kind and is often priced on request, so
the sale starts as a conversation. Do not add e-commerce machinery back without being asked.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (MUST pass before any commit)
- `npm run typecheck` — tsc --noEmit
- `npm run lint`
- `npm run seed` — reset + seed the catalogue and the admin user
- `npm run test:unit` — node:test unit tests
- `npm run test:e2e` — Playwright (set `CHROMIUM_PATH` if a browser is pre-installed)

## Non-negotiables
- IMPORTANT: Never invent an API, package name, env var, or config key. If unsure a symbol
  exists, read the types in `node_modules/` or run `npm view`. Say "I need to verify X".
- YOU MUST run `npm run typecheck && npm run build` before saying a task is done.
- YOU MUST NOT mark work complete based on code that was written but never executed.
- Every admin page and EVERY admin server action calls its own guard from
  `lib/auth/guards.ts` as its first statement. `proxy.ts` and the admin layout are a first
  line of defence, never the only one — a Server Action re-runs neither. A hidden UI element
  is not security.
- There is no code path that creates or promotes an account. The only admin comes from
  `npm run seed`. `role` is not a field in any schema.
- Prices are integers in paisa (1 PKR = 100 paisa). Never floats. `priceMinor: null` means
  "price on request" and must render as that, never as a blank or a zero.
- `treatment` is required on every stone, including when it is "None (untreated)".
  Disclosure is a trade obligation, not a nicety.
- An enquiry is written to the database BEFORE the notification email is attempted, and a
  send failure is recorded on the record rather than shown to the buyer. Losing a lead to an
  SMTP outage is worse than a missing email.
- Never pass a database document into a Client Component. ObjectId does not survive React
  serialisation. Map through `lib/view-models.ts`.

## Data layer
Application code talks to `GemCollection` (`lib/db/types.ts`), a narrow subset of the
official MongoDB driver's Collection API. Two implementations: the real driver when
`MONGODB_URI` is set, and `lib/db/memory/` otherwise. Adding a data feature means using the
existing subset — extend the interface only if genuinely needed, and implement BOTH sides.
See `docs/SPEC.md` §7 for why this exists.

## Conventions
- Follow the patterns already in the repo. Before adding a file, find the closest existing
  one and match its structure.
- Commit after each discrete task with conventional commits (`feat:`, `fix:`, `chore:`).
- Secrets live in `.env.local` only; keep `.env.example` in sync with placeholders.

## Design system
Palette, typefaces, spacing, radii and elevation are in `docs/DESIGN.md` and implemented as
tokens in `app/globals.css` (Tailwind v4 `@theme`, there is no `tailwind.config.ts`). Never
hardcode a hex value or font family in a component; if a token is missing, add it first.

The governing rule: **the interface is achromatic so the stones are the only saturated
colour on screen.** Gold (`--accent`) marks the primary action and nothing else. `--tray` is
the dark plate every stone photograph sits on, in both themes. `/styleguide` renders every
token with measured contrast ratios.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
