"use server";

import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/db";
import { CART_TOKEN_COOKIE, cartTokenCookieOptions, findCartId, resolveCart } from "@/lib/cart";

export type CartActionState = { error: string } | { success: true } | null;

/**
 * Add a product to the current visitor's cart (signed-in or guest).
 *
 * productId and quantity come from the form. productId is validated against
 * the database — a client cannot supply an arbitrary id and have it silently
 * succeed. quantity is clamped server-side (1–10); the client selector is a
 * convenience, not a trust boundary.
 *
 * If the product is already in the cart, quantities are summed atomically via
 * ON CONFLICT DO UPDATE so there is no race condition between two concurrent
 * "add" clicks.
 *
 * The anonymous cart token is written as an httpOnly cookie here when it is
 * newly minted — Server Components cannot write cookies, but Server Actions
 * can.
 */
export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const rawProductId = Number(formData.get("productId"));
  const rawQuantity = Number(formData.get("quantity") ?? "1");

  // Validate inputs — hostile or malformed data must not crash.
  if (!Number.isInteger(rawProductId) || rawProductId <= 0) {
    return { error: "Invalid product." };
  }
  const quantity = Math.max(1, Math.min(10, Math.floor(rawQuantity) || 1));

  // Confirm the product exists and is in stock, server-side.
  const [product] = await db
    .select({ id: schema.products.id, stock: schema.products.stock })
    .from(schema.products)
    .where(eq(schema.products.id, rawProductId))
    .limit(1);

  if (!product) return { error: "Product not found." };
  if (product.stock === 0) return { error: "This item is out of stock." };

  // Resolve (or create) the cart for this visitor.
  const { cartId, newToken } = await resolveCart();

  // Write the anonymous token cookie when freshly minted.
  if (newToken) {
    const store = await cookies();
    store.set(CART_TOKEN_COOKIE, newToken, cartTokenCookieOptions());
  }

  // Atomic upsert: increment quantity if the row already exists, never taking
  // the cart past the stock value we just read. The database expression keeps
  // concurrent add clicks from bypassing that limit.
  await db
    .insert(schema.cartItems)
    .values({ cartId, productId: product.id, quantity })
    .onConflictDoUpdate({
      target: [schema.cartItems.cartId, schema.cartItems.productId],
      set: {
        quantity: sql`least(${schema.cartItems.quantity} + ${quantity}, ${product.stock})`,
      },
    });

  // Update the cart's updatedAt timestamp.
  await db
    .update(schema.carts)
    .set({ updatedAt: new Date() })
    .where(eq(schema.carts.id, cartId));

  // Revalidate the whole layout so the header cart count refreshes.
  revalidatePath("/", "layout");

  return { success: true };
}

async function ownedCartItem(itemId: number) {
  const cartId = await findCartId();
  if (!cartId) return null;
  const [item] = await db
    .select({ id: schema.cartItems.id, productId: schema.cartItems.productId, stock: schema.products.stock })
    .from(schema.cartItems)
    .innerJoin(schema.products, eq(schema.cartItems.productId, schema.products.id))
    .where(sql`${schema.cartItems.id} = ${itemId} and ${schema.cartItems.cartId} = ${cartId}`)
    .limit(1);
  return item ?? null;
}

export async function updateCartQuantityAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const itemId = Number(formData.get("itemId"));
  const requestedQuantity = Number(formData.get("quantity"));
  if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(requestedQuantity)) {
    return { error: "Invalid cart update." };
  }

  const item = await ownedCartItem(itemId);
  // Do not reveal whether an item exists outside the current cart.
  if (!item) return { error: "Cart item not found." };
  if (item.stock <= 0) return { error: "This item is now out of stock." };

  const quantity = Math.max(1, Math.min(requestedQuantity, item.stock, 10));
  const cartId = await findCartId();
  if (!cartId) return { error: "Cart item not found." };
  await db
    .update(schema.cartItems)
    .set({ quantity })
    .where(sql`${schema.cartItems.id} = ${item.id} and ${schema.cartItems.cartId} = ${cartId}`);
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  return { success: true };
}

export async function removeFromCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const itemId = Number(formData.get("itemId"));
  if (!Number.isInteger(itemId) || itemId <= 0) return { error: "Invalid cart item." };

  const item = await ownedCartItem(itemId);
  if (!item) return { error: "Cart item not found." };
  const cartId = await findCartId();
  if (!cartId) return { error: "Cart item not found." };
  await db.delete(schema.cartItems).where(sql`${schema.cartItems.id} = ${item.id} and ${schema.cartItems.cartId} = ${cartId}`);
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  return { success: true };
}
