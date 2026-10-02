# Kartly — product spec

A 24-hour build of a general merchandise store. Kartly is its own brand, not a
clone: the recon in `/recon` is studied for *mechanics and information
hierarchy*, never copied for look, wording or logo.

Judged on **speed, product judgement and UX**. Every decision below is made
against those three, in that order of risk — a half-finished feature costs more
than a missing one.

## The core loop

The whole product is one path, and it must work end to end before anything
else is touched:

```
browse → search → product → cart → checkout → order history
```

Each step has one job:

| Step | Job | Done when |
| --- | --- | --- |
| **Browse** | Land, understand what the store sells, get into a category in one click | Home shows category tiles + a real product rail, all linking somewhere real |
| **Search** | Find a product among ~500 by keyword, then narrow it | Query + category/price/rating filters + sort, all in the URL, server-rendered |
| **Product** | Decide to buy | Gallery, price, rating summary, description, stock, reviews, add-to-cart, save |
| **Cart** | Confirm what I'm buying and what it costs | Line items, quantity change, remove, live totals, persists across sessions |
| **Checkout** | Pay | Address form → Stripe test payment → order created exactly once |
| **Order history** | Prove it happened | List of my orders, each opening a detail page with items and totals |

### Deliberate loop decisions

- **Search, filter and sort live entirely in the URL.** `?q=&category=&min=&max=&rating=&sort=&page=` is the single source of truth. Shareable, back-button-correct, server-rendered, and no client filter state to desynchronise. This is the single highest-leverage UX decision in the build.
- **The cart is server-side, keyed to the user, with an anonymous cart cookie merged on login.** Adding to cart before signing in is the common real path; losing that cart is the kind of thing a judge notices immediately.
- **Checkout captures the address first, then pays.** Matches the recon's order (address → payment → review) and means a failed payment never loses the address.
- **Order totals are frozen at purchase time.** Line items copy title, price and image onto the order row. Later price or catalogue edits must never rewrite history.
- **All money is integer cents, end to end** — database, cart maths, Stripe, display. Formatted to currency only at the render boundary. No floats anywhere.

## What we build

**Catalogue & browse**
- ~500 generated products across 10 categories, with brand, price, rating, review count, stock and filterable attributes (deterministic seed script)
- Home: category tiles, a featured rail, a deals rail
- Category pages, sharing the search results component

**Search**
- Keyword search over title, brand and description (Postgres full-text, weighted title > brand > description)
- Filters: category, price range, minimum rating, in-stock
- Sort: relevance, price asc/desc, rating, newest
- Result count, active-filter chips with individual clear, empty state that suggests a way out, pagination

**Product page**
- Image gallery with thumbnails, title, brand, rating summary linking to reviews
- Price, stock state, quantity selector, add to cart, add to wishlist
- Description and attribute table
- Reviews: list, rating histogram, and a write-review form for signed-in users

**Cart**
- Add / update quantity / remove, server-persisted, merged on login
- Totals: subtotal, shipping, tax, order total — all computed server-side
- Empty state that routes back into browse

**Checkout**
- Address form with validation
- Stripe Payment Element, **test mode**
- Order created from a webhook on payment success, idempotent by payment intent id
- Confirmation page

**Account**
- Register, log in, log out (email + password, hashed)
- Order history list + order detail
- Wishlist page

**Non-negotiables across every page**
- Every mutation re-checks ownership server-side from the session — never from a client-supplied user id
- Responsive down to ~375px; the recon's desktop density has to collapse sanely
- Real loading and empty states, not spinners over blank pages
- Keyboard-reachable controls and labelled form fields

## What we cut, and why

| Cut | Why |
| --- | --- |
| **Prime / subscriptions / memberships** | Pure Amazon surface area. Zero signal on the loop. |
| **Multi-seller marketplace, seller accounts** | Doubles the data model and every ownership check for no visible gain in a demo. |
| **Real shipping rates, carriers, tracking** | Flat-rate shipping rule stated plainly. Rate APIs are an integration risk with no UX payoff. |
| **Real tax calculation** | Flat rate, shown as a line item. Correct tax is a compliance project, not a 24h feature. |
| **Returns & refunds** | A whole second state machine hanging off orders. |
| **Recommendations / "customers also bought"** | Needs behavioural data that doesn't exist on day one. Faking it is worse than omitting it. |
| **Product variants (size/colour as separate SKUs)** | The honest version touches catalogue, search, cart and orders. Products are single-SKU; attributes are descriptive and filterable only. **Biggest deliberate cut.** |
| **Coupons, gift cards, promotions** | Each is a pricing edge case multiplied through cart, checkout and order totals. |
| **Address book / saved payment methods** | One address per order, entered at checkout. |
| **Admin / catalogue CMS** | Seed script is the admin. |
| **Email (receipts, password reset)** | Needs a deliverability provider and adds a failure mode mid-demo. Confirmation page + order history carry the proof. |
| **Image uploads / CDN pipeline** | Seeded image URLs only. |
| **Live chat, help centre, Q&A on products** | Content surfaces, not product surfaces. |

### Cuts we would reverse first, given more time
1. Product variants — the most-missed real feature.
2. Email receipts — the clearest gap after an order is placed.
3. Saved addresses — removes the most friction from a second purchase.

## Risks and how they're handled

| Risk | Handling |
| --- | --- |
| Deploy problems discovered at hour 23 | Deploy to Vercel on roadmap step 2, before any feature exists. Every later step ships to a URL that already works. |
| Stripe webhook can't reach localhost | Build checkout against the Stripe CLI listener from the start; the deployed webhook is configured in the same step. |
| Double orders from webhook retries | Order creation is idempotent on payment intent id, enforced by a unique constraint — not by application logic alone. |
| Seed data too thin to make search look real | 500 products across 10 categories, generated with varied attributes, seeded in step 1. |
| Scope creep from the recon's density | This cut list is the contract. Anything not listed under "what we build" needs an explicit decision to add. |

## How it will be judged, and where the time goes

- **Speed** — protected by deploying early and by one small verifiable roadmap step at a time.
- **Product judgement** — shown by this cut list. The visible argument is that the loop is complete and solid while obvious Amazon surface area is absent on purpose.
- **UX** — concentrated in search (URL state, filter chips, honest empty states), the product page, and a checkout that cannot lose work. Polish time goes to the path a judge will actually click.
