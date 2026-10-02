import { and, eq } from "drizzle-orm";
import Stripe from "stripe";

import { db, schema } from "@/db";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature.", { status: 400 });

  let event: Stripe.Event;
  try {
    // Stripe signs the exact raw body. Never parse JSON before verification.
    event = getStripe().webhooks.constructEvent(await request.text(), signature, getStripeWebhookSecret());
  } catch {
    return new Response("Invalid Stripe signature.", { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") return new Response(null, { status: 200 });
  const intent = event.data.object as Stripe.PaymentIntent;
  const orderId = Number(intent.metadata.orderId);
  const userId = Number(intent.metadata.userId);
  if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    return new Response("Invalid payment metadata.", { status: 400 });
  }

  // The PaymentIntent id plus user id must match our pending order. The
  // conditional update makes retrying the same signed Stripe event idempotent.
  const paid = await db
    .update(schema.orders)
    .set({ status: "paid" })
    .where(and(
      eq(schema.orders.id, orderId),
      eq(schema.orders.userId, userId),
      eq(schema.orders.paymentIntentId, intent.id),
      eq(schema.orders.status, "pending"),
    ))
    .returning({ id: schema.orders.id });
  if (paid.length === 0) return new Response(null, { status: 200 });

  const [cart] = await db.select({ id: schema.carts.id }).from(schema.carts).where(eq(schema.carts.userId, userId)).limit(1);
  if (cart) await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
  return new Response(null, { status: 200 });
}
