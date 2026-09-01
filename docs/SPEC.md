# Architecture spec — Royal Emerald Crest

A loose-gemstone dealer's site: a public catalogue, and a private admin panel. Buyers
**enquire**; they do not check out, and they do not have accounts.

Stack as installed and verified (`npm view <pkg> version`, then installed):

| Package | Version |
|---|---|
| next | 16.3.3 |
| react / react-dom | 19.2.8 |
| typescript | 5.x (create-next-app default) |
| tailwindcss | 4.x (CSS-first `@theme`, no `tailwind.config.ts`) |
| mongodb (official driver) | 7.6.0 |
| zod | 4.5.4 |
| bcryptjs | 3.0.3 |
| jose | 6.2.10 |
| nodemailer | 9.1.0 |
| @playwright/test | 1.62.1 |
| @radix-ui/react-{dialog,dropdown-menu,accordion,label,slot} | pinned in package.json |

## 0. What this app deliberately does not have

Removing these is the main design decision, not an omission:

- **No cart, checkout, payment or orders.** A stone is one of a kind and often priced on
  request; the transaction is a conversation. The enquiry replaces all four.
- **No customer accounts.** There is nothing for a buyer to log into. This removes signup,
  password reset for buyers, sessions for buyers, order history and saved addresses — and
  with them a large share of the app's attack surface.
- **No stock quantities.** A stone is `available`, `reserved` or `sold`.

The only account in the system is the admin, created by `npm run seed`. There is no code
path anywhere that creates or promotes an account.

## 1. Two justified deviations from a conventional stack

### 1.1 Official MongoDB driver, not Mongoose

Validation is not lost — Zod does it at every boundary and is shared with the client, which
Mongoose schemas are not. The driver's `Collection` API is also a small, exactly-known
surface, which the second deviation depends on.

### 1.2 First-party session auth (jose + bcryptjs), not Better Auth

The ecosystem position was checked and is accurate: Auth.js is in security-patch-only
maintenance, the Better Auth team took it over, and Better Auth is the current
recommendation for new Next.js projects.

It is still not what this uses, for two reasons. First, Better Auth's Mongo adapter needs a
live MongoDB, which this environment cannot provide (§7), and auth that cannot be run cannot
be tested. Second, and more decisively, **this app needs one login for one administrator** —
no OAuth, no organisations, no passkeys, no customer accounts. What ships is about 200 lines
with a surface small enough to be exercised completely:

- passwords: `bcryptjs`, cost 12
- session: an HS256 JWT via `jose` in an `httpOnly`, `sameSite=lax`, `secure`-in-production
  cookie, 7-day expiry, carrying `{ sub, email, role, ver }`
- `ver` mirrors `user.tokenVersion`; bumping it invalidates every existing session

**If you later want Better Auth, the seam is `lib/auth/session.ts` and `lib/auth/actions.ts`.**
Nothing else in the app reads the cookie or hashes anything.

## 2. Route map

| Route | Strategy | Notes |
|---|---|---|
| `/` | Static, `revalidate = 300` | Featured stones, varieties, recently added |
| `/collection` | Dynamic | Search, filter, sort, paginate — all state in the URL |
| `/collection/[slug]` | Dynamic | One variety, same controls |
| `/gem/[slug]` | SSG via `generateStaticParams`, `revalidate = 300` | Gallery, spec table, enquiry form, JSON-LD |
| `/contact` | Static | General enquiry |
| `/login` | Dynamic | Staff only; no signup link exists |
| `/admin`, `/admin/gems`, `/admin/gems/new`, `/admin/gems/[id]`, `/admin/categories`, `/admin/enquiries`, `/admin/enquiries/[id]` | `force-dynamic`, `noindex` | |
| `/img/gem/[slug]/[index]` | Dynamic | Generated demo imagery (§8) |

## 3. Data model

Money is an integer count of paisa (1 PKR = 100 paisa). No floats, ever, including on the
wire. Formatting happens only at render.

### `users`
`email`, `passwordHash`, `name`, `role: "admin"`, `tokenVersion`, `disabled`,
`resetTokenHash`, `resetTokenExpiresAt`, timestamps.
Index: `{ email: 1 }` **unique** — login lookup and duplicate prevention in one.

### `categories` — gem varieties
`slug`, `name`, `description`, `sortOrder`, `active`, timestamps.
Indexes: `{ slug: 1 }` unique (every variety URL is a slug lookup);
`{ active: 1, sortOrder: 1 }` (the nav's exact query, fully covered).

### `gems`
| Field | Type |
|---|---|
| `slug`, `reference`, `title`, `description` | string |
| `categoryId` | ObjectId |
| `categorySlug` | string — denormalised so variety pages filter without a `$lookup` |
| `caratWeight` | number |
| `shape`, `cut`, `colour`, `clarity` | string |
| `dimensionsMm` | `{ length, width, depth }` |
| `origin`, `treatment`, `certificate` | string |
| `priceMinor` | int \| **null** — null means "price on request" |
| `status` | `available` \| `reserved` \| `sold` |
| `featured`, `published` | bool |
| `images` | `{ url, alt, width, height }[]` |
| `deletedAt` | Date \| null — soft delete |

Indexes and the query each serves:
- `{ slug: 1 }` unique — the stone page.
- `{ reference: 1 }` unique — stock references must not collide.
- `{ published: 1, deletedAt: 1, categorySlug: 1, caratWeight: -1 }` — the variety page.
  Equality fields first, then the sort field, so a variety sorted by carat is answered from
  the index.
- `{ published: 1, deletedAt: 1, createdAt: -1 }` — home and "newest".
- `{ title, reference, origin, colour, description }` **text**, weighted
  `{ title: 10, reference: 8, origin: 4, colour: 3, description: 1 }`.
  A collection may hold only one text index, which is why all five share it.

> **Stock references bypass the text index.** `REC-EM-0101` tokenises to `kg`, `em`, `0101`,
> and `kg` matches every stone in the shop. A query matching the reference pattern is looked
> up exactly instead, and returns nothing when it misses rather than falling through to the
> tokenised search. Found by testing; see `lib/gems/queries.ts`.

### `enquiries`
`reference` (e.g. `REC-7Q2M4X`), `gemId`, `gemSlug`, `gemTitle`, `gemReference`, `name`,
`email`, `phone`, `message`, `status: new|replied|closed`, `emailSent`, `emailError`,
`adminNote`, timestamps.
Indexes: `{ reference: 1 }` unique; `{ status: 1, createdAt: -1 }` (the inbox);
`{ gemId: 1, createdAt: -1 }` (every enquiry about one stone).

The stone's title and reference are **copied onto the enquiry at submission**, read from the
database, so the record still reads correctly after the stone is edited or deleted — and so
nothing about the stone can be forged through the form.

## 4. The enquiry flow

1. The buyer submits `{ gemSlug, name, email, phone, message }`. That is the whole payload —
   no price, no title, no status, and there is no field for one to arrive in.
2. Zod parses it. A filled honeypot returns the ordinary success message.
3. Rate limit: 5 enquiries per 30 minutes per IP.
4. The stone is loaded **from the database** by slug; every stored detail comes from there.
5. **The enquiry is written first.**
6. The notification email is attempted, and the outcome — success or the error text — is
   written back onto the enquiry.
7. The buyer is told it succeeded, and given a quotable reference.

Order matters: a dealer who loses a lead because an SMTP server was briefly down has lost
real money. The admin inbox is the record; the email is a notification on top of it. Failed
deliveries are surfaced on the dashboard and flagged on the row.

## 5. Email

Two transports behind one `sendMail()`:

- **SMTP** via nodemailer when `SMTP_HOST`, `ENQUIRY_RECIPIENT` and `MAIL_FROM` are all set.
- **Local outbox** otherwise: each message is written to `.rec-data/outbox/*.eml`.

The outbox is not a stub. It exists so the flow is observable end to end with nothing
configured, and it is what the tests exercise. `Reply-To` is set to the buyer, so hitting
Reply in a mail client answers them rather than the server.

## 6. Security

| Concern | Measure |
|---|---|
| Admin routes | `proxy.ts` verifies the JWT at the edge **and** every page calls `requireAdmin()`, which re-reads the session and re-loads the user from the database |
| Server actions | Every admin action calls `requireAdminAction()` as its first statement. A Server Action is a POST to the page endpoint and re-runs neither the proxy nor the layout |
| Privilege escalation | No route creates or promotes an account. `role` is not a field in any schema |
| Mass assignment | Every write names its fields explicitly from a Zod-parsed object. No request body is ever spread into an update |
| Passwords | bcryptjs cost 12; the hash never leaves the data layer |
| Session invalidation | `tokenVersion` on the user; bumping it kills every existing session |
| Enumeration | Login returns the same message whether or not the account exists |
| Rate limiting | login 5/15min per IP+email; enquiries 5/30min per IP. **In-memory: single instance only** — swap for Redis before scaling out |
| Spam | Honeypot field plus the rate limit |
| Client boundary | Database documents never cross into Client Components; `lib/view-models.ts` maps to plain shapes. An ObjectId does not survive React serialisation |
| Headers | CSP for the image optimiser, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` |
| Secrets | Server-only via `lib/env.ts`; nothing secret is `NEXT_PUBLIC_` |

## 7. The database constraint in this environment

This sandbox has **no MongoDB and no way to obtain one**: `fastdl.mongodb.org` is refused by
the egress policy (403 on CONNECT, in the proxy's own failure log), there is no `mongod` on
the image or in the distro repos, the Docker daemon is not running, and GitHub access is
scoped to this repository, so no third-party server binary can be fetched either. Every
avenue was tried; this is reported rather than papered over.

So the app talks to a **`GemCollection` interface** — a narrow subset of the driver's
`Collection` API — with two implementations:

- **`lib/db/mongo.ts`** — the real `mongodb@7.6.0` driver, with a `globalThis`-cached client
  so dev hot-reload cannot exhaust the Atlas connection pool. Used when `MONGODB_URI` is set.
  **This is the production path.**
- **`lib/db/memory/`** — an in-process, file-backed store implementing the same subset:
  a query matcher (`$eq $ne $gt $gte $lt $lte $in $nin $and $or $regex $exists`), update
  operators (`$set $inc $push $pull $setOnInsert $unset`), sort/skip/limit/projection, unique
  and sparse-unique index enforcement, and a weighted text scorer mirroring the index weights.
  An unsupported operator **throws** rather than silently matching nothing.

**What this proves and what it does not.** All application logic — routing, auth, the guards,
the enquiry flow, admin CRUD, search and filtering — is single-implementation code exercised
by 41 unit tests and 24 Playwright tests. What is **not** proven here is MongoDB-specific
behaviour: that the planner actually chooses the indexes in §3, real `$text` ranking, and
driver-level concurrency. Those need a run against Atlas, and the README says so.

## 8. Images

Demo stones are drawn by `app/img/gem/[slug]/[index]/route.ts`: a deterministic faceted SVG
whose hue comes from the variety, on the dark tray colour. It exists because the demo has no
photographs and must still render.

**This is not the production image path.** A real catalogue stores provider URLs
(Cloudinary / UploadThing / S3) in `gem.images[].url`; add the hostname to
`next.config.ts` `images.remotePatterns` and the route goes unused. Nothing is base64 in the
database.

## 9. File structure

```
app/
  (shop)/        storefront: /, /collection, /collection/[slug], /gem/[slug], /contact
  (admin)/admin/ dashboard, gems, categories, enquiries
  login/
  img/gem/       generated demo imagery
components/  ui/ gem/ enquiry/ layout/ admin/
lib/
  db/            types.ts (GemCollection), collections.ts, documents.ts, mongo.ts, memory/
  auth/          session.ts, guards.ts, actions.ts, password.ts, rate-limit.ts
  gems/ admin/ enquiries/ email/ forms/ validation/
  money.ts site-config.ts env.ts browse-params.ts view-models.ts cn.ts
scripts/       seed.ts, catalogue.ts
tests/         unit/ e2e/
docs/
```

## 10. Acceptance criteria

1. `npm run typecheck` and `npm run build` exit 0. ✔
2. `npm run seed` creates 7 varieties, 23 stones with 3–4 images each, and one admin. ✔
3. A buyer can filter by variety, origin, treatment and availability, sort, and paginate,
   entirely server-side with all state in the URL. ✔
4. A stock reference finds exactly its stone; an unknown one shows the empty state. ✔
5. Every stone page shows the full spec table with treatment always disclosed. ✔
6. A buyer can send an enquiry; it is stored, the notification is attempted, and the delivery
   outcome is recorded on the record. ✔
7. A sold stone cannot be enquired on. ✔
8. Logged out, every `/admin` route redirects to `/login`, and a direct server-action POST
   does too. A forged session cookie is rejected. ✔
9. An admin can create a stone, see it live, change its status, and soft-delete it — after
   which the public page 404s and the record survives. ✔
10. Every page is usable at 360px with no horizontal overflow. ✔
