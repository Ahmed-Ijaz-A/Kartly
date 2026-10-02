import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { StripePaymentForm } from "@/components/stripe-payment-form";
import { db, schema } from "@/db";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Payment — Kartly" };
export const dynamic = "force-dynamic";

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const session = await requireSession("/login?next=/checkout");
  const { order: rawOrder } = await searchParams;
  const orderId = Number(rawOrder);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  const [order] = await db.select({ id: schema.orders.id, status: schema.orders.status, totalCents: schema.orders.totalCents }).from(schema.orders).where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, session.userId))).limit(1);
  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/confirmation?order=${order.id}`);
  if (order.status !== "pending") redirect("/checkout");
  return <div className="mx-auto max-w-xl"><p className="text-sm font-medium text-ink-700">Checkout · 2 of 2</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Payment</h1><p className="mt-2 text-sm text-ink-700">Secure test payment for {formatCents(order.totalCents)}.</p><div className="mt-6 rounded-card bg-surface p-6 shadow-sm"><StripePaymentForm orderId={order.id} /></div></div>;
}
