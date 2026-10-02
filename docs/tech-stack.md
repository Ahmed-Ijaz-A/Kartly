# Kartly — tech stack

Chosen for a 24-hour build: one language, one deploy target, managed services
for everything that would otherwise need operating.

| Layer | Choice |
| --- | --- |
| Framework | Next.js, App Router |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS |
| Database | Postgres on Neon |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Payments | Stripe, **test mode only** |
| Hosting | Vercel |

## Next.js (App Router, TypeScript)

- **Server Components by default.** Product, search and order pages query the database directly and render on the server. Client Components only where there is genuine interactivity: quantity steppers, filter controls, the Stripe Payment Element.
- **Server Actions for mutations** — add to cart, update quantity, submit a review. Each one re-reads the session server-side and does its own ownership check. No REST layer built just to be called by our own pages.
- **Route Handlers** reserved for things that are genuinely HTTP endpoints: the Stripe webhook.
- **URL as state.** `searchParams` drives search; no client-side filter store.
- **TypeScript `strict`**, and the build is not allowed to ignore type or lint errors. `next.config` must never set `ignoreBuildErrors`.

## Tailwind CSS

- Utility classes inline; no parallel CSS architecture to maintain.
- **Kartly's own design tokens** — brand palette, spacing and radii defined once in the Tailwind config. Deliberately not Amazon's orange-on-navy.
- A small set of shared primitives (button, input, card, badge) so pages stay consistent without pulling in a component library.
- No UI kit dependency: the time saved is not worth the bundle and the override fights at this scale.

## Postgres on Neon

- Serverless Postgres, works with Vercel's execution model without connection-pool exhaustion.
- Branching gives a throwaway database per environment if needed.
- **Money is `integer` cents everywhere.** No `float`, no `money` type. A `numeric` column would still invite float maths in JS.
- Full-text search via a weighted expression GIN index (title > brand > description) — enough for ~500 products, and no second service to run.

## Drizzle ORM

- TypeScript-first: the schema file is the source of truth and query results are typed without a generation step in the hot loop.
- SQL-shaped API, so search with dynamic filters, sorting and pagination stays readable instead of fighting a query builder.
- `drizzle-kit` for versioned migrations, committed to the repo. Schema changes are never applied by hand against the deployed database.

### Core tables

`users`, `products`, `categories`, `carts`, `cart_items`, `orders`,
`order_items`, `reviews`, `wishlist_items`.

Two constraints that matter more than the rest:
- `orders.payment_intent_id` is **unique** — webhook retries cannot create a second order.
- `order_items` copies title, price and image at purchase time, so order history is immutable against later catalogue edits.

## Stripe (test mode)

- **Payment Element**, so card entry is Stripe-hosted and no card data touches our server or database.
- Flow: create a PaymentIntent server-side with the amount recomputed **from the database cart**, never from a client-supplied total → confirm client-side → Stripe webhook is what actually creates the order.
- The webhook verifies the signature, and order creation is idempotent on the payment intent id.
- Test mode for the whole build. Test card numbers documented in the README.

## Vercel

- Native target for Next.js; preview deploy per push.
- **Deployed at roadmap step 2**, before features exist, so deployment is never a last-hour unknown.
- Environment variables live in Vercel's dashboard and in a local `.env.local` that is gitignored. `.env.example` lists the *names* only.

## Secrets

Never in the repo, never in a prompt, never in a log line, never in a client
component. `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the
session secret are server-only; the single publishable Stripe key is the only
one allowed a `NEXT_PUBLIC_` prefix.

## Auth

Email + password, our own tables — no third-party provider to configure.

- Passwords hashed with a slow, salted hash; never logged, never returned from a query that feeds a response.
- Session is an httpOnly, secure, sameSite cookie.
- The session is read **server-side on every mutation**. A user id arriving from the client is treated as untrusted input.

## Tooling

- ESLint + TypeScript, both run before any roadmap step is called finished.
- Prettier with Tailwind class sorting.
- No test framework. At this timescale, verification is `lint` + `typecheck` + clicking the loop on the deployed URL, and the roadmap is sized so every step is clickable.

## Explicitly not used

| Not used | Why |
| --- | --- |
| Redux / Zustand / React Query | Server Components plus URL state remove the need. |
| A component library | Override fights cost more than the primitives save at this size. |
| Separate search service | Postgres full-text is sufficient for ~500 products. |
| Docker / local Postgres | Neon from the first commit; one database, no drift. |
| Redis | Nothing in the loop needs a second datastore. |
