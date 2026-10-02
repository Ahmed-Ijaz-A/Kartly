# Kartly — roadmap

Ordered. One step at a time, stop for approval after each.

Every step states how to verify it. A step is finished only when `npm run lint`
and `npm run typecheck` both pass **and** the verification below has actually
been performed — not assumed.

Order is deliberate: deployment and data come before features, the core loop
comes before everything optional, and polish is last so it is the thing that
gets cut if time runs out — never the loop.

---

## Phase 0 — Foundations

### Step 1 — Project skeleton  ✅ *(done; merged with steps 3 and 4, and part of 6)*
Next.js (App Router, TypeScript strict) + Tailwind with Kartly's tokens.
Root layout, header shell, footer, `/` placeholder. ESLint, Prettier, scripts.
`.env.example` with names only; `.env.local` gitignored.
**Verify:** `npm run dev` serves a branded page; lint and typecheck pass.

### Step 2 — Deploy to Vercel
Connect the repo, set env vars in the dashboard, ship the skeleton.
**Verify:** the live URL renders the page from step 1. *Nothing else proceeds until this is green.*

### Step 3 — Database and schema  ✅ *(done as part of step 1)*
Neon project. Drizzle schema for all nine tables, with money as integer cents,
`orders.payment_intent_id` unique, and the products `tsvector` + GIN index.
First migration generated and applied.
**Verify:** migration applies cleanly to Neon; a trivial server-side query returns from the deployed URL.

### Step 4 — Seed the catalogue  ✅ *(written as part of step 1; needs running against Neon)*
~500 products across 10 categories: brand, price in cents, rating, review
count, stock, image URLs, filterable attributes. Seeded reviews. Deterministic
and re-runnable.
**Verify:** row counts correct; prices are integers; spot-check variety across categories.

---

## Phase 1 — Browse and find

### Step 5 — Product card + grid
Shared card (image, title, brand, rating, price) and a responsive grid.
**Verify:** a temporary page lists seeded products; grid reflows at 375px.

### Step 6 — Home page
Category tiles, featured rail, deals rail — every tile and card links somewhere real.
**Verify:** on the live URL, no dead links; looks intentional at mobile and desktop.

### Step 7 — Search results page
`/search` reading `q`, `category`, `min`, `max`, `rating`, `sort`, `page` from the URL.
Full-text keyword search, server-rendered. Result count, pagination.
**Verify:** a query returns sensible results; changing the URL by hand changes them; back button is correct.

### Step 8 — Filters and sort UI
Sidebar filters and a sort control that write to the URL. Active-filter chips
with individual clear, and an empty state offering a way out.
**Verify:** filters compose; chips clear individually; a deliberately empty result set is handled gracefully; shared URL reproduces the exact view.

### Step 9 — Category pages
`/category/[slug]` reusing the search results component.
**Verify:** home tiles land on populated category pages that still filter and sort.

---

## Phase 2 — Decide and collect

### Step 10 — Product detail page
Gallery with thumbnails, title, brand, rating summary, price, stock, quantity
selector, description, attribute table. Breadcrumbs.
**Verify:** a card click reaches the right product; gallery works; stock state is honest.

### Step 11 — Reviews (display)
Review list and rating histogram on the product page, from seeded data.
**Verify:** histogram matches the underlying rows; a product with no reviews reads correctly.

---

## Phase 3 — Accounts

### Step 12 — Register, log in, log out
Credentials auth, hashed passwords, httpOnly session cookie. Header reflects
signed-in state.
**Verify:** register → log out → log back in works on the live URL; the password never appears in a response, log, or the database in plaintext.

### Step 13 — Route protection and the ownership rule
Server-side session helper. Protected routes redirect. Establishes the pattern
every later mutation uses: read the session on the server, never trust a
client-supplied user id.
**Verify:** signed-out access to a protected route redirects; a hand-forged user id in a request body changes nothing.

---

## Phase 4 — Cart

### Step 14 — Cart data + add to cart
Server-side cart keyed to user, anonymous cart cookie for signed-out visitors.
Add to cart from product page and card, via Server Action.
**Verify:** adding persists across a refresh; the header count updates.

### Step 15 — Cart page
Line items, quantity update, remove, totals (subtotal, shipping, tax, order
total) computed server-side. Empty state.
**Verify:** totals are correct in integer cents at several quantities; removing the last item shows the empty state.

### Step 16 — Merge anonymous cart on login
Guest cart merges into the user cart at sign-in; quantities combine, nothing is lost.
**Verify:** add as guest → log in → cart still has the items, merged with anything already there.

---

## Phase 5 — Checkout (highest risk — do not compress)

### Step 17 — Address step
Validated address form, saved to the pending order. Blocks an empty cart.
**Verify:** invalid input is rejected with usable messages; a valid address advances.

### Step 18 — Stripe Payment Element
PaymentIntent created server-side with the amount **recomputed from the database cart**. Payment Element mounted. Stripe CLI listener running locally.
**Verify:** Stripe test card succeeds and a declined test card fails visibly; the intent amount matches the server-computed total exactly.

### Step 19 — Webhook and order creation
Signature-verified webhook creates the order and copies line items with
title/price/image. Idempotent on payment intent id. Cart cleared. Webhook
configured on the deployed URL too.
**Verify:** a test purchase on the **live URL** creates exactly one order; replaying the webhook event creates no second order.

### Step 20 — Order confirmation page
Order number, items, totals, address, next step.
**Verify:** redirect after payment lands here with correct values; another user cannot open the same order.

---

## Phase 6 — Account surfaces

### Step 21 — Order history
`/orders` list and `/orders/[id]` detail, both ownership-checked.
**Verify:** my order appears with correct frozen totals; a second account gets 404 on that id, not a glimpse of it.

### Step 22 — Wishlist
Save/remove from product page and cart; `/wishlist` page; move to cart.
**Verify:** saves persist across sessions; wishlist is per-user and not readable by another account.

### Step 23 — Write a review
Signed-in users submit a rating and text; product aggregates update.
**Verify:** a submitted review appears and moves the average and histogram; signed-out users are offered sign-in, not a broken form.

---

## Phase 7 — Finish (cuttable, in this order from the bottom)

### Step 24 — Responsive and accessibility pass
Every page at 375px. Labelled inputs, keyboard-reachable controls, visible
focus, alt text, sane heading order.
**Verify:** walk the whole loop at 375px and with the keyboard only.

### Step 25 — Loading, empty and error states
Suspense boundaries, skeletons on the slow pages, a real 404 and error page.
**Verify:** throttled network never shows a blank page; a bad product id gives a proper 404.

### Step 26 — README and final pass
Setup, env var names, Stripe test cards, live URL. Walk the full loop on the
deployed site as a brand-new user.
**Verify:** browse → search → product → cart → checkout → order history completes on the live URL from a fresh account.

---

## If time runs short

Cut from the bottom. Steps 1–20 are the product; without step 19 there is no
order, so checkout is never the thing that gets compressed. Steps 21–23 are
expected by a judge. Steps 24–26 are polish — valuable, and still the right
thing to lose first.
