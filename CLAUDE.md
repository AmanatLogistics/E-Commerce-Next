# Project: Chowk

Marketplace-style e-commerce store (consumer electronics + home goods, PKR / en-PK).
Customer storefront + private admin panel. Store name lives in `lib/site-config.ts` only.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (MUST pass before any commit)
- `npm run typecheck` — tsc --noEmit
- `npm run lint`
- `npm run seed` — reset + seed the database with the demo catalogue and the admin user
- `npm run test:unit` — node:test unit tests (money, query matcher, pricing, transitions)
- `npm run test:e2e` — Playwright golden-path tests

## Non-negotiables
- IMPORTANT: Never invent an API, package name, env var, or config key. If you are not
  certain a symbol exists, read the types in `node_modules/` or run `npm view`. Say
  "I need to verify X" rather than guessing.
- YOU MUST run `npm run typecheck && npm run build` before saying a task is done.
- YOU MUST NOT mark work complete based on code that was written but never executed.
- Every admin route, server action, and API handler calls `requireAdmin()` from
  `lib/auth/guards.ts`, which re-reads the session AND re-loads the user from the database.
  Middleware is a first line of defence, never the only one. A hidden UI element is not
  security.
- Prices are integers in paisa (1 PKR = 100 paisa). Never floats. Never a price on the wire
  from the client.
- Server recalculates every order total from the database via `lib/orders/pricing.ts`.
  The checkout payload schema has no price field at all.
- Use the simplest approach that satisfies the requirement. No speculative abstraction.

## Data layer
Application code talks to `ChowkCollection` (`lib/db/collections.ts`), a narrow subset of
the official MongoDB driver's Collection API. Two implementations: the real driver when
`MONGODB_URI` is set, and `lib/db/memory/` otherwise. Adding a data feature means using the
existing subset — extend the interface only if genuinely needed, and implement BOTH sides.
See `docs/SPEC.md` §9 for why this exists.

## Conventions
- Follow the patterns already in the repo. Before adding a file, find the closest existing
  one and match its structure.
- Commit after each discrete task with conventional commits (`feat:`, `fix:`, `chore:`).
- Secrets live in `.env.local` only; keep `.env.example` in sync with placeholders.

## Design system
Palette, typefaces, spacing, radii and elevation are defined in `docs/DESIGN.md` and
implemented as tokens in `app/globals.css` (Tailwind v4 `@theme`, there is no
`tailwind.config.ts`). Never hardcode a hex value or font family in a component. If a token
is missing, add it to `globals.css` first. `--accent` (brass) is reserved for price and
discount only.
