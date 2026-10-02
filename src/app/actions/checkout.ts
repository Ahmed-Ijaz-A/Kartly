"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, schema } from "@/db";
import { calculateCartTotals, getCartLines } from "@/lib/cart";
import { requireSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export type AddressActionState = { error: string } | null;
export type PaymentIntentResult = { clientSecret: string } | { error: string };

type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};

function readAddress(formData: FormData): Address | null {
  const name = String(formData.get("name") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  if (!name || name.length > 160 || !line1 || line1.length > 200 || line2.length > 200 || !city || city.length > 120 || !postalCode || postalCode.length > 32 || !/^[A-Z]{2}$/.test(country)) return null;
  return { name, line1, line2, city, postalCode, country };
}

export async function saveCheckoutAddressAction(
  _previous: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const session = await requireSession("/login?next=/checkout");
  const address = readAddress(formData);
  if (!address) return { error: "Enter a complete delivery address and a two-letter country code." };

  const lines = await getCartLines();
  if (lines.length === 0) return { error: "Your cart is empty. Add an item before checking out." };
  if (lines.some((line) => line.stock < line.quantity)) return { error: "One or more cart items are no longer available in that quantity." };
  const totals = calculateCartTotals(lines);

  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: session.userId,
      paymentIntentId: `pending_${randomUUID()}`,
      status: "pending",
      ...totals,
      shippingName: address.name,
      shippingLine1: address.line1,
      shippingLine2: address.line2,
      shippingCity: address.city,
      shippingPostalCode: address.postalCode,
      shippingCountry: address.country,
    })
    .returning({ id: schema.orders.id });

  redirect(`/checkout/payment?order=${order.id}`);
}

export async function createPaymentIntentAction(orderId: number): Promise<PaymentIntentResult> {
  if (!Number.isInteger(orderId) || orderId <= 0) return { error: "Invalid checkout." };
  const session = await requireSession("/login?next=/checkout");
  const [order] = await db
    .select({ id: schema.orders.id, paymentIntentId: schema.orders.paymentIntentId, status: schema.orders.status })
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, session.userId)))
    .limit(1);
  if (!order || order.status !== "pending") return { error: "Checkout not found." };

  const lines = await getCartLines();
  if (lines.length === 0 || lines.some((line) => line.stock < line.quantity)) return { error: "Your cart changed. Return to your cart and review it before paying." };
  const totals = calculateCartTotals(lines);
  const stripe = getStripe();

  if (!order.paymentIntentId.startsWith("pending_")) {
    const existing = await stripe.paymentIntents.retrieve(order.paymentIntentId);
    if (existing.status !== "canceled" && existing.client_secret) return { clientSecret: existing.client_secret };
  }

  const intent = await stripe.paymentIntents.create({
    amount: totals.totalCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: String(order.id), userId: String(session.userId) },
  });
  if (!intent.client_secret) return { error: "Stripe could not prepare payment." };

  await db
    .update(schema.orders)
    .set({ ...totals, paymentIntentId: intent.id })
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.userId, session.userId), eq(schema.orders.status, "pending")));

  // Snapshot the exact database-cart lines used for the PaymentIntent.
  await db.delete(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  await db.insert(schema.orderItems).values(lines.map((line) => ({
    orderId: order.id,
    productId: line.productId,
    titleSnapshot: line.title,
    imageUrlSnapshot: line.imageUrl,
    unitPriceCents: line.priceCents,
    quantity: line.quantity,
  })));
  return { clientSecret: intent.client_secret };
}

export async function abandonCheckoutAction(orderId: number): Promise<void> {
  const session = await requireSession("/login?next=/checkout");
  if (!Number.isInteger(orderId) || orderId <= 0) return;
  await db
    .update(schema.orders)
    .set({ status: "abandoned" })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, session.userId), eq(schema.orders.status, "pending")));
  revalidatePath("/checkout");
}
