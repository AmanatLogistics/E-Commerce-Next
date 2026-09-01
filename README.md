# Royal Emerald Crest

A loose-gemstone dealer's website: a public catalogue of individual stones, and a private
admin panel to manage them. Buyers **send an enquiry about a stone**; there is no cart, no
checkout and no customer account.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 and MongoDB.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional for a local run; see Configuration
npm run seed                   # 7 varieties, 23 stones, 1 admin
npm run dev                    # http://localhost:3000
```

Sign in to the admin panel at **/login**:

```
admin@royalemeraldcrest.example
AdminPass123!
```

Change `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env.local` before deploying
anywhere, then re-run `npm run seed`.

**It runs with no database installed.** When `MONGODB_URI` is absent the app uses a
file-backed in-process store at `.rec-data/db.json`. Set `MONGODB_URI` and it uses the real
MongoDB driver instead, with no other change. See [Data layer](#data-layer).

## What it does

**Storefront**
- Home: selected stones, varieties, recently added.
- `/collection` and `/collection/[variety]`: server-side search, filter (variety, origin,
  untreated only, available only), sort (newest, carat, price) and pagination — all state in
  the URL, so a result is shareable and survives the back button.
- `/gem/[slug]`: gallery with arrows, swipe, thumbnails and zoom; the full gemmological
  specification; Product JSON-LD; and the enquiry form.
- `/contact`: a general enquiry for something not currently listed.

**Admin** (`/admin`, staff only)
- Dashboard: stock and enquiry counts, undelivered notifications, latest enquiries.
- Stones: list with search, create, edit, publish/unpublish, status, feature, soft delete
  and restore.
- Varieties: full CRUD. A variety still holding stones is hidden rather than deleted.
- Enquiries: inbox filtered by status, detail view, status transitions and internal notes.

## How an enquiry works

1. The buyer submits **only** `{ gemSlug, name, email, phone, message }`. There is no price,
   title or status field for one to arrive in.
2. Zod validates it; a honeypot catches bots; 5 enquiries per 30 minutes per IP.
3. The stone is loaded from the database — every stored detail comes from there, so nothing
   about the stone can be forged through the form.
4. **The enquiry is saved first.**
5. The notification email is attempted, and the outcome is written back onto the record.
6. The buyer gets a quotable reference such as `REC-7Q2M4X`.

A mail failure never loses a lead: the admin inbox is the record, the email is a notification
on top of it, and failures are flagged on the dashboard and on the row.

## Configuration

Copy `.env.example` to `.env.local`. Everything has a working default for local development
except `AUTH_SECRET` in production.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Production | Use the real MongoDB driver. Absent = in-memory store |
| `MONGODB_DB` | No | Database name (default `royal_emerald_crest`) |
| `REC_MEMORY_DB` | No | Where the in-memory driver persists |
| `AUTH_SECRET` | **Yes in production** | Session signing key. `openssl rand -base64 32` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | No | The admin `npm run seed` creates |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | For real email | nodemailer transport |
| `ENQUIRY_RECIPIENT` | For real email | Where enquiry notifications go |
| `MAIL_FROM` | For real email | From address |
| `MAIL_OUTBOX` | No | Where `.eml` files land when SMTP is unset |
| `NEXT_PUBLIC_SITE_URL` | Production | Used in metadata and enquiry emails |

Without SMTP configured, notifications are written to `.rec-data/outbox/*.eml` and the
dashboard says so plainly. That is a deliberate fallback, not a silent failure.

## Data layer

Application code talks to `GemCollection`, a narrow subset of the official driver's
`Collection` API, with two implementations behind it:

- **`lib/db/mongo.ts`** — `mongodb@7.6.0`, with a `globalThis`-cached client so dev
  hot-reload cannot exhaust the Atlas connection pool. **The production path.**
- **`lib/db/memory/`** — a file-backed in-process store implementing the same subset:
  query matching, update operators, sort/skip/limit/projection, unique and sparse-unique
  index enforcement, and a weighted text scorer. An unsupported operator throws rather than
  silently matching nothing.

Why: this project was built in an environment where no MongoDB could be installed or
downloaded, and untested code is not finished code. See `docs/SPEC.md` §7 for the full
account, including what this does and does not prove.

## Testing

```bash
npm run test:unit    # 41 tests: driver, money, params, validation, rate limiting
npm run test:e2e     # 24 tests: storefront, enquiry, admin access, admin CRUD
```

The E2E suite seeds a database and starts its own dev server. If Chromium is already on the
machine, point Playwright at it rather than downloading one:

```bash
CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

Covered, among others: a stock reference finds exactly its stone; an unknown one shows the
empty state; a sold stone cannot be enquired on; every admin route redirects a logged-out
visitor; a direct server-action POST without a session is refused; a forged session cookie is
rejected; login does not reveal whether an account exists; an admin can publish a stone, see
it live, mark it sold and soft-delete it.

## Deploying

1. Create a MongoDB Atlas cluster and set `MONGODB_URI`.
2. Set `AUTH_SECRET` (`openssl rand -base64 32`), `NEXT_PUBLIC_SITE_URL`, and the SMTP block.
3. Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to real values.
4. `npm run seed` once against the production database — this creates the indexes in
   `docs/SPEC.md` §3 and the admin account.
5. `npm run build && npm start`, or deploy to any Node host.
6. For real photographs, add your image host to `images.remotePatterns` in `next.config.ts`
   and put provider URLs in each stone's images. The generated-SVG route then goes unused.

## Known limitations

Stated plainly, because these are the things that will bite.

- **The indexes have never been exercised by a real query planner.** No MongoDB could run in
  the environment this was built in (`fastdl.mongodb.org` blocked by egress policy, no
  `mongod`, no Docker daemon). Business logic is covered by 65 passing tests, but index
  usage, real `$text` ranking and driver concurrency need a run against Atlas.
- **`$text` ranking will differ slightly from the in-memory scorer.** The scorer mirrors the
  index weights and the intent, not MongoDB's exact algorithm. Re-check search ordering after
  moving to Atlas.
- **Rate limiting is in process memory.** It protects a single instance and resets on
  restart. Behind more than one instance, move it to Redis before relying on it.
- **No image upload.** The admin takes image URLs; it does not accept files. Wire up
  Cloudinary/UploadThing/S3 for a real catalogue.
- **Email is send-only.** There is no inbound parsing and no threading; replies go to the
  dealer's own mailbox via `Reply-To`.
- **No password reset for the admin.** The account is created by the seed script; resetting
  means re-running it. With one administrator this is deliberate, and it removes a whole
  token flow from the attack surface.
- **The seeded stones are demonstration data.** The varieties, localities and treatments are
  drawn from published sources on Pakistani deposits, but the individual weights, dimensions,
  references and prices are invented. Do not read them as real inventory or valuations.
- **Lighthouse has not been measured.** No headless-Chrome audit was run here, so no scores
  are quoted. Run it yourself before launch rather than trusting a number nobody measured.

## Documentation

- `docs/RESEARCH.md` — how gem dealers actually sell, the attributes that matter, sources.
- `docs/DESIGN.md` — the "Emerald & Ivory" design system and its self-critique.
- `docs/SPEC.md` — architecture, data model with every index, security, acceptance criteria.
- `CLAUDE.md` — working rules for anyone (or any agent) editing this repo.
- `/styleguide` — every token and component state, with measured contrast ratios.
