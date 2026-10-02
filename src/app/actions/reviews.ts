"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/db";
import { getSession } from "@/lib/session";

export type ReviewActionState = { error: string } | { success: true } | null;

export async function submitReviewAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getSession();
  if (!session) return { error: "Sign in to write a review." };
  const productId = Number(formData.get("productId"));
  const rating = Number(formData.get("rating"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(rating) || rating < 1 || rating > 5 || !title || title.length > 200 || !body || body.length > 2_000) return { error: "Add a rating, short title, and review text." };

  const [product] = await db.select({ id: schema.products.id, slug: schema.products.slug }).from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!product) return { error: "Product not found." };
  const [user] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
  if (!user) return { error: "Sign in to write a review." };

  await db.insert(schema.reviews).values({ productId: product.id, userId: session.userId, authorName: user.name, rating, title, body });

  // products.rating/reviewCount is seeded as the catalogue's full rating
  // aggregate (hundreds of ratings per product), independent of the much
  // smaller number of actual written review rows -- the histogram already
  // reads from those rows directly. Fold the new rating into the existing
  // aggregate rather than recomputing from the review rows alone, which
  // would collapse a product's real rating count down to just its written
  // reviews. Done as one atomic SQL expression so concurrent submissions
  // can't race each other reading and writing the same two columns.
  await db
    .update(schema.products)
    .set({
      reviewCount: sql`${schema.products.reviewCount} + 1`,
      rating: sql`(${schema.products.rating} * ${schema.products.reviewCount} + ${rating}) / (${schema.products.reviewCount} + 1)`,
    })
    .where(eq(schema.products.id, product.id));

  revalidatePath(`/product/${product.slug}`);
  return { success: true };
}
