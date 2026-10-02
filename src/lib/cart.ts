/**
 * Cart resolution and count utilities.
 *
 * resolveCart() is for Server Actions only — it may write a cookie (the
 * anonymous token) and mutate the database. Call it from addToCartAction,
 * updateQuantityAction, removeFromCartAction etc.
 *
 * getCartCount() is read-only and safe to call from Server Components (e.g.
 * the root layout header). It never creates a cart or writes any cookie.
 *
 * The anonymous cart token is a 64-char hex string stored in a httpOnly
 * cookie. It is the only identifier for a guest's cart. At login (Step 16)
 * the guest cart merges into the user cart and the token cookie is cleared.
 */

import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { getSession } from "@/lib/session";

export const CART_TOKEN_COOKIE = "kartly_cart";
const CART_TOKEN_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Flat rules are deliberate scope for this build. Keep them here so checkout
// reuses exactly the same integer-cent calculation.
export const FLAT_SHIPPING_CENTS = 699;
export const FREE_SHIPPING_THRESHOLD_CENTS = 5_000;
export const TAX_RATE_PERCENT = 8;

export type CartLine = {
  id: number;
  productId: number;
  quantity: number;
  title: string;
  slug: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
};

export function calculateCartTotals(lines: Pick<CartLine, "quantity" | "priceCents">[]) {
  const subtotalCents = lines.reduce((total, line) => total + line.priceCents * line.quantity, 0);
  const shippingCents = subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
    ? 0
    : FLAT_SHIPPING_CENTS;
  // Round half up with integers; do not introduce floating point into money maths.
  const taxCents = Math.floor((subtotalCents * TAX_RATE_PERCENT + 50) / 100);
  return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}

/**
 * Returns the cartId for the current request, creating a cart (and, for guests,
 * an anonymous token cookie) when none exists. Call only from Server Actions.
 *
 * The returned `newToken` is non-null exactly when a fresh token was minted —
 * the caller must set it as a cookie (Server Actions can write cookies;
 * this helper cannot guarantee the cookie write will persist if the caller
 * forgets, so we return it explicitly rather than writing it here).
 */
export async function resolveCart(): Promise<{ cartId: number; newToken?: string }> {
  const session = await getSession();

  if (session) {
    // Signed-in path: one cart per user.
    const [existing] = await db
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.userId, session.userId))
      .limit(1);

    if (existing) return { cartId: existing.id };

    const [created] = await db
      .insert(schema.carts)
      .values({ userId: session.userId })
      .returning({ id: schema.carts.id });
    return { cartId: created.id };
  }

  // Guest path: look up the anonymous token cookie.
  const store = await cookies();
  const existingToken = store.get(CART_TOKEN_COOKIE)?.value;

  if (existingToken) {
    const [existing] = await db
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.anonymousToken, existingToken))
      .limit(1);

    if (existing) return { cartId: existing.id };

    // Token present but the cart row was deleted (wiped dev DB, etc.) —
    // recreate it with the same token so the cookie stays consistent.
    const [created] = await db
      .insert(schema.carts)
      .values({ anonymousToken: existingToken })
      .returning({ id: schema.carts.id });
    return { cartId: created.id };
  }

  // No token yet — mint one and create the cart.
  const newToken = randomBytes(32).toString("hex");
  const [created] = await db
    .insert(schema.carts)
    .values({ anonymousToken: newToken })
    .returning({ id: schema.carts.id });
  return { cartId: created.id, newToken };
}

/**
 * Total item count (sum of quantities) for the current visitor's cart.
 * Returns 0 if no cart exists — never creates one.
 * Safe to call from Server Components.
 */
export async function getCartCount(): Promise<number> {
  const session = await getSession();
  const store = await cookies();

  let cartId: number | undefined;

  if (session) {
    const [cart] = await db
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.userId, session.userId))
      .limit(1);
    cartId = cart?.id;
  } else {
    const token = store.get(CART_TOKEN_COOKIE)?.value;
    if (!token) return 0;
    const [cart] = await db
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.anonymousToken, token))
      .limit(1);
    cartId = cart?.id;
  }

  if (!cartId) return 0;

  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.cartItems.quantity}), 0)::int` })
    .from(schema.cartItems)
    .where(eq(schema.cartItems.cartId, cartId));

  return row?.total ?? 0;
}

/** Convenience: cookie options to reuse when writing the anonymous token. */
export function cartTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: CART_TOKEN_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * Returns the cartId for the current visitor without creating one.
 * Returns null if no cart exists. Safe to call from Server Components.
 *
 * Use resolveCart() in Server Actions when you want to create the cart on
 * demand. Use findCartId() in Server Components when you only need to read.
 */
export async function findCartId(): Promise<number | null> {
  const session = await getSession();
  const store = await cookies();

  if (session) {
    const [cart] = await db
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.userId, session.userId))
      .limit(1);
    return cart?.id ?? null;
  }

  const token = store.get(CART_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const [cart] = await db
    .select({ id: schema.carts.id })
    .from(schema.carts)
    .where(eq(schema.carts.anonymousToken, token))
    .limit(1);
  return cart?.id ?? null;
}

/** Read the current visitor's cart and product snapshots without creating one. */
export async function getCartLines(): Promise<CartLine[]> {
  const cartId = await findCartId();
  if (!cartId) return [];

  return db
    .select({
      id: schema.cartItems.id,
      productId: schema.cartItems.productId,
      quantity: schema.cartItems.quantity,
      title: schema.products.title,
      slug: schema.products.slug,
      priceCents: schema.products.priceCents,
      stock: schema.products.stock,
      imageUrl: schema.products.imageUrl,
    })
    .from(schema.cartItems)
    .innerJoin(schema.products, eq(schema.cartItems.productId, schema.products.id))
    .where(eq(schema.cartItems.cartId, cartId));
}

/**
 * Move a guest cart into the authenticated user's cart. The user id comes
 * from the registration/login lookup, never from client form data.
 */
export async function mergeAnonymousCart(userId: number): Promise<void> {
  const store = await cookies();
  const token = store.get(CART_TOKEN_COOKIE)?.value;
  if (!token) return;

  const [guestCart] = await db
    .select({ id: schema.carts.id })
    .from(schema.carts)
    .where(eq(schema.carts.anonymousToken, token))
    .limit(1);

  if (!guestCart) {
    store.delete(CART_TOKEN_COOKIE);
    return;
  }

  await db.insert(schema.carts).values({ userId }).onConflictDoNothing();
  const [userCart] = await db
    .select({ id: schema.carts.id })
    .from(schema.carts)
    .where(eq(schema.carts.userId, userId))
    .limit(1);
  if (!userCart) throw new Error("Could not create a cart for this account.");

  const guestLines = await db
    .select({ productId: schema.cartItems.productId, quantity: schema.cartItems.quantity, stock: schema.products.stock })
    .from(schema.cartItems)
    .innerJoin(schema.products, eq(schema.cartItems.productId, schema.products.id))
    .where(eq(schema.cartItems.cartId, guestCart.id));

  for (const line of guestLines) {
    if (line.stock <= 0) continue;
    await db
      .insert(schema.cartItems)
      .values({ cartId: userCart.id, productId: line.productId, quantity: Math.min(line.quantity, line.stock) })
      .onConflictDoUpdate({
        target: [schema.cartItems.cartId, schema.cartItems.productId],
        set: { quantity: sql`least(${schema.cartItems.quantity} + ${line.quantity}, ${line.stock})` },
      });
  }

  await db.delete(schema.carts).where(and(eq(schema.carts.id, guestCart.id), eq(schema.carts.anonymousToken, token)));
  store.delete(CART_TOKEN_COOKIE);
}
