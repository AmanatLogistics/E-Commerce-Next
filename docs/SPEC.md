# Architecture spec — Chowk

Stack as installed and verified (`npm view <pkg> version`, then installed):

| Package | Version |
|---|---|
| next | 16.3.3 |
| react / react-dom | 19.2.8 |
| typescript | 5.x (create-next-app default; TS 7.0.2 exists but Next 16 and eslint-config-next are not yet pinned to it) |
| tailwindcss | 4.x (CSS-first `@theme`, no `tailwind.config.ts`) |
| mongodb (official driver) | 7.6.0 |
| zod | 4.5.4 |
| bcryptjs | 3.0.3 |
| jose | 6.2.10 |
| @playwright/test | 1.62.1 |
| @radix-ui/react-{dialog,dropdown-menu,accordion,label} | 1.1.23 / 2.1.24 / 1.2.20 / 2.1.15 |

## 0. Two deviations from the brief's baseline, and why

The brief allows changing the baseline "only if you can justify it". Two changes:

### 0.1 Official MongoDB driver, not Mongoose

The brief permits either. The driver is chosen because the second deviation (below) needs a
small, exactly-known storage surface to stand behind, and the driver's `Collection` API is
that surface. Mongoose's schema/middleware/populate layer would have to be re-implemented to
run anywhere without a live server. Validation is not lost — Zod does it at every boundary,
and it is shared with the client, which Mongoose schemas are not.

### 0.2 First-party session auth (jose + bcryptjs), not Better Auth

The brief's own instruction was to check the ecosystem and then choose with a stated reason.
**The ecosystem claim in the brief is correct and was verified**: Auth.js is in
security-patch-only maintenance, the Better Auth team took it over, and Better Auth is the
current recommendation for new Next.js projects, with a first-party MongoDB adapter
(`@better-auth/mongo-adapter` exists on npm).

It is still not what this build uses, for one concrete reason: **Better Auth's Mongo adapter
requires a live MongoDB server**, and this environment has none (see §9). The brief's ground
rule 4 says code that was never executed is not done. An auth system I cannot run is a
liability, not a feature. What ships instead is ~200 lines with a surface small enough to be
fully exercised by the E2E suite:

- password hashing: `bcryptjs` (cost 12)
- session: a signed JWT (HS256) via `jose`, in an `httpOnly`, `sameSite=lax`, `secure`
  (in production) cookie, 7-day expiry, carrying `{ sub, email, role, ver }`
- `ver` is a token version stored on the user; bumping it invalidates every existing session
  (used by password reset and by an admin disabling an account)

**If you later move to Atlas and want Better Auth, this is the seam:** everything auth-related
is behind `lib/auth/session.ts` and `lib/auth/actions.ts`. Nothing else in the app reads the
cookie or hashes anything.

## 1. Route map

`R` = React Server Component. All prices come from the server on every route.

### Public storefront — `app/(shop)/`

| Route | Strategy | Notes |
|---|---|---|
| `/` | R, `revalidate = 300` | Category rail, deals strip, product grid |
| `/category/[slug]` | R, dynamic | Server-side pagination/sort/filter; params in URL |
| `/search` | R, dynamic | Text search; `?q=&page=&sort=&min=&max=&cat=&inStock=` |
| `/product/[slug]` | R, `generateStaticParams` + `revalidate = 300` | ISR; stock is re-read dynamically in the buy box |
| `/cart` | R, `dynamic` | Reads guest or user cart by cookie/session |
| `/checkout` | R, `dynamic` | Linear `?step=account\|address\|payment\|review` |
| `/order/[id]/confirmation` | R, `dynamic` | Token-guarded so guests can view their own order |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | R + client form | |
| `/styleguide` | R, static | Every token, type style, component state |

### Account — `app/(account)/account/` — requires a session

`/account` (profile), `/account/orders`, `/account/orders/[id]`, `/account/addresses`.
All dynamic; every one re-checks the session server-side.

### Admin — `app/(admin)/admin/` — requires `role === "admin"`

`/admin` (dashboard), `/admin/products`, `/admin/products/new`, `/admin/products/[id]`,
`/admin/categories`, `/admin/orders`, `/admin/orders/[id]`, `/admin/customers`,
`/admin/customers/[id]`. All dynamic, never cached, `noindex`.

## 2. Data model

Money is **always an integer in paisa** (1 PKR = 100 paisa). No floats anywhere, including
in JSON sent to the client. Formatting to "Rs 12,499" happens only at render.

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `email` | string | lowercased, trimmed |
| `passwordHash` | string | bcrypt, cost 12 |
| `name` | string | |
| `role` | `"customer" \| "admin"` | |
| `tokenVersion` | int | bump invalidates all sessions |
| `disabled` | boolean | |
| `resetTokenHash`, `resetTokenExpiresAt` | string?, Date? | sha256 of the emailed token |
| `createdAt`, `updatedAt` | Date | |

Indexes: `{ email: 1 }` **unique** — login lookup and duplicate-signup prevention in one.
`{ role: 1, createdAt: -1 }` — the admin customer list, sorted, without a collection scan.

### `categories`
`_id`, `slug`, `name`, `description`, `image`, `sortOrder` int, `active` bool, timestamps.
Indexes: `{ slug: 1 }` **unique** (every category URL is a slug lookup);
`{ active: 1, sortOrder: 1 }` (the nav rail's exact query, fully covered).

### `products`
| Field | Type |
|---|---|
| `slug` | string |
| `title`, `description` | string |
| `brand` | string |
| `categoryId` | ObjectId |
| `categorySlug` | string (denormalised — lets category pages filter without a `$lookup`) |
| `priceMinor` | int (paisa) |
| `compareAtMinor` | int \| null (original price when discounted) |
| `currency` | `"PKR"` |
| `stock` | int |
| `images` | `{ url, alt, width, height }[]` (3–4, order is display order) |
| `specs` | `{ label, value }[]` |
| `rating` | `{ average: number, count: int }` |
| `published` | bool |
| `deletedAt` | Date \| null (soft delete) |
| `createdAt`, `updatedAt` | Date |

Indexes and the query each one serves:
- `{ slug: 1 }` **unique** — PDP lookup.
- `{ published: 1, deletedAt: 1, categorySlug: 1, priceMinor: 1 }` — the category page's
  compound query. Equality fields first, then the range/sort field, so a category page
  filtered by price and sorted by price is served entirely from the index.
- `{ published: 1, deletedAt: 1, createdAt: -1 }` — "newest" sort and the home grid.
- `{ title: "text", description: "text", brand: "text" }` with weights
  `{ title: 10, brand: 5, description: 1 }` — the search box. Weights make a title match
  outrank a description mention, which is what "relevance" has to mean here.
- `{ stock: 1, published: 1 }` — the admin low-stock panel.

> One MongoDB constraint that shapes the design: **a collection may have only one text
> index.** That is why all three searchable fields live in a single compound text index
> rather than three separate ones.

### `carts`
`_id`, `userId` ObjectId|null, `guestToken` string|null, `items: [{ productId, qty }]`,
`updatedAt`. **The cart stores no prices** — storing them is how stale-price and
price-tamper bugs get in. Prices are joined from `products` on every read.
Indexes: `{ userId: 1 }` sparse-unique, `{ guestToken: 1 }` sparse-unique,
`{ updatedAt: 1 }` TTL 30 days on guest carts only.

### `orders`
`_id`, `orderNumber` (human-readable, e.g. `CHK-8F3K2A`), `userId|null`, `email`,
`items: [{ productId, slug, title, image, unitPriceMinor, qty, lineTotalMinor }]`
(a **snapshot** — an order must not change when a product's price later changes),
`subtotalMinor`, `shippingMinor`, `totalMinor`, `shippingMethod`, `shippingAddress`,
`billingAddress`, `paymentMethod` (`"cod" | "card"`), `paymentStatus`, `status`,
`statusHistory: [{ from, to, at, byUserId, byEmail, note }]`, `guestAccessToken`,
timestamps.
Indexes: `{ orderNumber: 1 }` unique; `{ userId: 1, createdAt: -1 }` (account order history,
sorted, covered); `{ status: 1, createdAt: -1 }` (admin filter-by-status list);
`{ email: 1, createdAt: -1 }` (guest order lookup).

### `addresses`
`_id`, `userId`, `label`, `fullName`, `phone`, `line1`, `line2?`, `city`, `province`,
`postalCode`, `country` (`"PK"`), `isDefault`, timestamps.
Index: `{ userId: 1, isDefault: -1 }`.

### `reviews`
`_id`, `productId`, `userId`, `authorName`, `rating` 1–5, `title`, `body`, `createdAt`.
Indexes: `{ productId: 1, createdAt: -1 }`; `{ productId: 1, userId: 1 }` unique
(one review per customer per product).

## 3. Auth and RBAC

- Session cookie `chowk_session`, `httpOnly`, `sameSite=lax`, `secure` in production,
  7-day expiry, HS256-signed with `AUTH_SECRET`.
- **`middleware.ts` guards `/admin/*` and `/account/*`.** It verifies the JWT signature at
  the edge and redirects on failure. This is a *first* line of defence, not the only one.
- **`requireAdmin()` in `lib/auth/guards.ts` re-reads the session, re-loads the user from
  the database, and re-checks `role === "admin"` and `!disabled` on every admin page,
  server action, and route handler.** It throws, it does not return a boolean, so a
  forgotten `if` cannot silently permit the call. Middleware alone is never trusted: a
  Server Action is a POST to the page's own endpoint, and a stale cookie carrying
  `role: "admin"` would pass a signature check but must still fail the database check.
- There is **no code path that creates an admin.** Signup hardcodes `role: "customer"` and
  ignores any `role` in the request body. The only admin is made by `npm run seed`.

## 4. Cart model and guest→user merge

A logged-out visitor gets a `chowk_cart` cookie holding a random 32-byte `guestToken`;
the cart row is keyed by it. On login **and** on signup, `mergeGuestCart()` runs in the same
request:

1. Load guest cart by token and user cart by `userId`.
2. For each guest line, if the product is already in the user cart, `qty = min(guestQty +
   userQty, stock)`; otherwise insert, clamped to stock.
3. Delete the guest cart row and clear the cookie.

Union with clamping, not replacement: replacing loses whichever cart the shopper built first.

## 5. Order lifecycle

```
pending ──▶ cod_confirmed ──▶ processing ──▶ shipped ──▶ delivered
   │              │                │
   └──────────────┴────────────────┴──▶ cancelled
                                   └──▶ refunded (from paid/processing/shipped/delivered)
```

- `pending` — created; card flow awaiting payment.
- `cod_confirmed` — COD order accepted (this is where COD orders start).
- Only an **admin** may move an order forward. A **customer** may cancel only while the
  order is `pending` or `cod_confirmed`. Every transition is validated against an explicit
  allow-list in `lib/orders/transitions.ts` and appends to `statusHistory` with the acting
  user, so the admin order page shows who changed what and when.

## 6. Payments

v1 ships **cash on delivery**. A Stripe **test-mode** card path sits behind
`NEXT_PUBLIC_ENABLE_CARD_PAYMENTS`, default `false`; when off, the payment step offers COD
only and no Stripe code is reachable or bundled. No real payment integration was asked for
and none is built.

**Totals are recomputed server-side, always.** `lib/orders/pricing.ts` takes only
`{ productId, qty }[]` and a shipping method id. It re-reads each product from the database,
uses the database price, re-derives every line total, subtotal, shipping and grand total, and
rejects out-of-stock or unpublished lines. The client cannot submit a price — there is no
price field in the checkout payload schema, so a tampered one is dropped by Zod before it
reaches any logic. Proven by `tests/e2e/price-tampering.spec.ts`.

## 7. Security checklist

| Concern | Measure |
|---|---|
| Input validation | Zod at every boundary; schemas in `lib/validation/` shared client and server |
| Mass assignment | Every update action picks fields explicitly from a Zod-parsed object. No `{...body}` into an update. `role`, `priceMinor` from a customer, `_id`, and timestamps are never assignable from a request |
| Password storage | bcryptjs cost 12; hash never leaves the data layer (`toPublicUser()` strips it) |
| Session | Signed JWT, httpOnly, sameSite=lax, secure in prod; `tokenVersion` for global invalidation |
| Rate limiting | Fixed-window limiter on login (5/15min/IP+email), signup (5/hr/IP), password reset (3/hr/email), search (30/min/IP). In-memory by default — **single-instance only**; swap for Redis before scaling out (noted in README limitations) |
| Enumeration | Login and forgot-password return the same message whether or not the account exists |
| Secrets | Server-only env read through `lib/env.ts`; nothing secret is prefixed `NEXT_PUBLIC_` |
| Image upload | Admin only; MIME + magic-byte sniff, 5 MB cap, extension allow-list, provider-hosted (Cloudinary/S3), never base64 in Mongo |
| Admin surface | `requireAdmin()` inside every admin action, independent of middleware |
| Guest order access | Confirmation page requires an unguessable `guestAccessToken`, not just the order id |
| Headers | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` set in `next.config.ts` |

## 8. File structure

```
app/
  (shop)/          storefront routes + layout
  (account)/       customer account
  (admin)/         admin panel, its own restrained layout
  styleguide/
  api/
components/  ui/ product/ search/ cart/ checkout/ admin/ layout/
lib/
  db/            client.ts, collections.ts, indexes.ts
  db/memory/     the in-memory driver described in §9
  auth/          session.ts, guards.ts, actions.ts, password.ts, rate-limit.ts
  cart/ orders/ products/ validation/
  money.ts site-config.ts env.ts search-params.ts
scripts/seed.ts
tests/unit/ tests/e2e/
docs/
```

## 9. The database constraint in this environment — read this

This sandbox has **no MongoDB and no way to obtain one**: `fastdl.mongodb.org` is refused by
the egress policy (`403` on CONNECT, recorded in the proxy's own failure log), there is no
`mongod` on the image and none in the distro repos, the Docker daemon is not running, and
GitHub access is scoped to this repository only, so no third-party server binary can be
fetched either. Every avenue was tried and is reported here rather than papered over.

So the app talks to a **`ChowkCollection` interface** — a deliberately narrow subset of the
official driver's `Collection` API — with two implementations:

- **`lib/db/mongo.ts`** — the real `mongodb@7.6.0` driver. Used whenever `MONGODB_URI` is
  set. This is the production path and what you will run on Atlas.
- **`lib/db/memory/`** — an in-process implementation of that same subset: a document store
  with a query matcher (`$eq $ne $gt $gte $lt $lte $in $nin $and $or $regex $exists`),
  update operators (`$set $inc $push $pull $setOnInsert`), sort/skip/limit/projection, and a
  weighted text-search scorer matching the text-index weights above. Used when `MONGODB_URI`
  is absent. It is what makes `npm run seed`, `npm run dev`, and the whole Playwright suite
  runnable here.

**What this does and does not prove.** All application logic — routing, auth, RBAC, cart
merge, server-side total recomputation, the order state machine, admin actions — is genuine
single-implementation code exercised by the tests. What is **not** proven in this environment
is MongoDB-server-specific behaviour: that the indexes in §2 are actually chosen by the
planner, real `$text` ranking, and driver-level concurrency. Those need a run against Atlas.
The README says the same thing under "Known limitations"; nothing here is reported as
verified that was not observed.

## 10. Acceptance criteria

### Phase 2
1. `npm run typecheck` and `npm run build` both exit 0.
2. `/styleguide` renders every colour token with its measured contrast ratio, all seven type
   styles, every button and input state, and each card variant.
3. `npm run seed` creates 6 categories, ~40 products with 3–4 images each, and one admin.
4. A new signup gets `role: "customer"` even if the request body contains `role: "admin"`.
5. Logged out, `/admin` redirects to `/login`. As a customer, `/admin` returns 403/redirect.
   As the seeded admin, `/admin` renders.

### Phase 3
6. Category pages paginate, sort (relevance/price asc/price desc/newest), and filter
   (category, price range, in-stock) entirely server-side, with all state in the URL.
7. Search returns weighted results; the empty state offers real next actions.
8. The PDP gallery navigates by arrows and by swipe, shows thumbnails, and zooms.
9. A guest cart survives a reload and merges into the user cart on login without loss.
10. Guest checkout completes without an account and shipping is in the total before the
    final step.
11. Every page is usable at 360px, keyboard-navigable with a visible focus ring.

### Phase 4
12. Admin can CRUD products and categories, and move an order through its lifecycle, with
    each transition recorded with actor and timestamp.
13. Playwright covers the golden path end to end: signup → search → filter → add to cart →
    guest checkout → order visible in admin → admin changes status → customer sees it.
14. A test proves a logged-out user and a logged-in customer can reach **no** `/admin` route
    and can invoke **no** admin server action directly.
15. A test proves a tampered client-side price does not change the order total.
