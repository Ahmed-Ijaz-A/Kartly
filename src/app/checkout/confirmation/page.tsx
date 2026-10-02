import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db, schema } from "@/db";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Order confirmation — Kartly" };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const session = await requireSession("/login?next=/checkout");
  const { order: rawOrder } = await searchParams;
  const orderId = Number(rawOrder);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  const [order] = await db.select({ id: schema.orders.id, status: schema.orders.status, totalCents: schema.orders.totalCents, shippingName: schema.orders.shippingName, shippingLine1: schema.orders.shippingLine1, shippingCity: schema.orders.shippingCity, shippingPostalCode: schema.orders.shippingPostalCode, shippingCountry: schema.orders.shippingCountry }).from(schema.orders).where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, session.userId))).limit(1);
  if (!order) notFound();
  if (order.status !== "paid") return <div className="mx-auto max-w-xl rounded-card bg-surface p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-ink-900">Confirming your payment</h1><p className="mt-2 text-sm text-ink-700">Your payment was submitted. This page will update once Stripe confirms it.</p><meta httpEquiv="refresh" content="3" /></div>;
  return <div className="mx-auto max-w-xl rounded-card bg-surface p-8 shadow-sm"><p className="text-sm font-medium text-ink-700">Order #{order.id}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Thanks for your order</h1><p className="mt-3 text-sm text-ink-700">Your payment of {formatCents(order.totalCents)} is confirmed. We’ll deliver to {order.shippingName}, {order.shippingLine1}, {order.shippingCity} {order.shippingPostalCode}, {order.shippingCountry}.</p><Link href="/" className="mt-6 inline-flex rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-ink-50 hover:bg-ink-800">Continue shopping</Link></div>;
}
