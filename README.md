# Kartly

A 24-hour build of a general merchandise store — browse, search, product, cart,
checkout, order history.

- [docs/spec.md](docs/spec.md) — the core loop, what we build, what we cut and why
- [docs/tech-stack.md](docs/tech-stack.md) — stack and the reasoning behind it
- [roadmap.md](roadmap.md) — ordered, verifiable steps
- [CLAUDE.md](CLAUDE.md) — working rules

Stack: Next.js (App Router, TypeScript) · Tailwind · Postgres on Neon ·
Drizzle ORM · Stripe test mode · Vercel.

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL
npm run db:migrate             # create the tables
npm run db:seed                # load ~500 products
npm run dev                    # http://localhost:3000
```

### Getting a `DATABASE_URL`

1. Create a free project at [neon.tech](https://neon.tech).
2. **Connection Details** → copy the **pooled** connection string (it contains
   `-pooler`), including `?sslmode=require`.
3. Put it in `.env.local` as `DATABASE_URL`.

`.env.local` is gitignored and must never be committed. `.env.example` holds
variable **names only** — never real values.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a migration from the schema |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:seed` | Load the catalogue (clears and re-seeds) |
| `npm run db:fetch-amazon` | Re-sample the Amazon Reviews 2023 dataset into `scripts/amazon-products.json` |
| `npm run db:studio` | Drizzle Studio, to browse the data |

Both `lint` and `typecheck` must pass before any roadmap step is finished.

## Data model

Nine tables in [src/db/schema.ts](src/db/schema.ts): `users`, `categories`,
`products`, `carts`, `cart_items`, `orders`, `order_items`, `reviews`,
`wishlist_items`.

Three decisions are load-bearing:

- **All money is integer cents.** Every amount column is `integer`. Formatting
  to a currency string happens only in [src/lib/money.ts](src/lib/money.ts), at
  render time.
- **`orders.payment_intent_id` is unique.** This is what makes Stripe webhook
  retries idempotent — enforced by the database, not by application logic.
- **`order_items` snapshots title, price and image** at purchase time, so later
  catalogue edits can never rewrite order history.

Search uses a weighted GIN index on the products table (title > brand >
description), so keyword search needs no second service.

## Catalogue data

`npm run db:seed` loads **500 real products across 10 categories**, with
prices in cents, ratings, stock levels, descriptions and seeded reviews.

It is deterministic for everything it generates — a seeded PRNG drives every
fallback price, stock level and review selection, so re-running produces the
same catalogue rather than a different one. It clears the catalogue tables
first, so it is safe to re-run.

**Source: the [Amazon Reviews 2023](https://amazon-reviews-2023.github.io/)
dataset** (McAuley Lab, UC San Diego), an academic dataset free to use for
coursework. `npm run db:fetch-amazon` pulls a sample of real listings per
category — title, brand, description, price/rating where present, and a real
multi-angle photo set — into `scripts/amazon-products.json`, which
`npm run db:seed` then loads. Title and description always come from the same
real listing, so they can't be mismatched the way independently-generated
text and stock photography could be.

**Trade-off, stated plainly:** this means real brand names (e.g. Fat Shark,
SAS) and real Amazon product photography appear on listings — Kartly's own
UI (layout, logo, colours, copy) is still entirely its own design, but the
catalogue content itself is not invented. See
[docs/spec.md](docs/spec.md#what-we-build) for the reasoning.

Nothing is scraped from a page that disallows it: the dataset is downloaded
directly from its own Hugging Face–hosted distribution via byte-range
requests (not a full download — each category file is sampled, never pulled
whole), and Amazon's own image CDN serves the photos directly (publicly
cacheable, no hotlink protection).

## Deploying to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → **Import** the repository. The
   framework preset detects Next.js; no build settings need changing.
3. Add environment variables under **Settings → Environment Variables**, for
   Production, Preview and Development:

   | Variable | Needed now | Value |
   | --- | --- | --- |
   | `DATABASE_URL` | **Yes** | Your Neon pooled connection string |
   | `NEXT_PUBLIC_APP_URL` | **Yes** | Your deployed URL, e.g. `https://kartly.vercel.app` |
   | `SESSION_SECRET` | Step 12 | A long random string |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Step 18 | Stripe **test** publishable key |
   | `STRIPE_SECRET_KEY` | Step 18 | Stripe **test** secret key |
   | `STRIPE_WEBHOOK_SECRET` | Step 19 | From the Vercel webhook endpoint |

4. Deploy.

Migrations are **not** run automatically on deploy. Run `npm run db:migrate`
locally against the same Neon database — there is one database, so the schema
is shared with the deployed app.

The build does not require a database, so a first deploy succeeds even before
`DATABASE_URL` is set; the home page then renders setup instructions instead of
the catalogue.

## Security

- Secrets live in `.env.local` and Vercel's environment settings only. Never in
  the repo, a commit message, a log line or a prompt.
- Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_APP_URL` are
  exposed to the browser. Everything else is server-only.
- Stripe stays in **test mode** for this build.

## Brand

Kartly is its own brand. The screenshots in `/recon` are reference for
mechanics and information hierarchy only — never for look, wording or logo.
