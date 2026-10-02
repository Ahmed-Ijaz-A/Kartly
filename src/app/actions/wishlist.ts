"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/db";
import { resolveCart } from "@/lib/cart";
import { getSession } from "@/lib/session";

export type WishlistActionState = { error: string } | { saved: boolean } | null;

export async function toggleWishlistAction(
  _previous: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const session = await getSession();
  if (!session) return { error: "Sign in to save items." };
  const productId = Number(formData.get("productId"));
  if (!Number.isInteger(productId) || productId <= 0) return { error: "Invalid product." };
  const [product] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!product) return { error: "Product not found." };

  const [existing] = await db.select({ id: schema.wishlistItems.id }).from(schema.wishlistItems).where(and(eq(schema.wishlistItems.userId, session.userId), eq(schema.wishlistItems.productId, product.id))).limit(1);
  if (existing) {
    await db.delete(schema.wishlistItems).where(and(eq(schema.wishlistItems.id, existing.id), eq(schema.wishlistItems.userId, session.userId)));
    revalidatePath("/wishlist");
    return { saved: false };
  }
  await db.insert(schema.wishlistItems).values({ userId: session.userId, productId: product.id }).onConflictDoNothing();
  revalidatePath("/wishlist");
  return { saved: true };
}

export async function moveWishlistToCartAction(
  _previous: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const session = await getSession();
  if (!session) return { error: "Sign in to manage your wishlist." };
  const productId = Number(formData.get("productId"));
  if (!Number.isInteger(productId) || productId <= 0) return { error: "Invalid product." };
  const [saved] = await db
    .select({ productId: schema.wishlistItems.productId, stock: schema.products.stock })
    .from(schema.wishlistItems)
    .innerJoin(schema.products, eq(schema.wishlistItems.productId, schema.products.id))
    .where(and(eq(schema.wishlistItems.userId, session.userId), eq(schema.wishlistItems.productId, productId)))
    .limit(1);
  if (!saved) return { error: "Saved item not found." };
  if (saved.stock <= 0) return { error: "This item is out of stock." };

  const { cartId } = await resolveCart();
  await db.insert(schema.cartItems).values({ cartId, productId: saved.productId, quantity: 1 }).onConflictDoUpdate({
    target: [schema.cartItems.cartId, schema.cartItems.productId],
    set: { quantity: sql`least(${schema.cartItems.quantity} + 1, ${saved.stock})` },
  });
  await db.delete(schema.wishlistItems).where(and(eq(schema.wishlistItems.userId, session.userId), eq(schema.wishlistItems.productId, saved.productId)));
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  revalidatePath("/", "layout");
  revalidatePath("/wishlist");
  revalidatePath("/cart");
  return { saved: false };
}
