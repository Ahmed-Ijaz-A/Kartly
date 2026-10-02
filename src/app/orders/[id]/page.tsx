import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getUserOrder } from "@/db/queries";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Order details — Kartly" };
export const dynamic = "force-dynamic";

/**
 * Ownership-checked the same way as the checkout confirmation page: the
 * query filters by session.userId in the WHERE clause itself, so another
 * user's order id returns null here and notFound() below -- never a
 * different error that would confirm the id exists.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("/login?next=/orders");
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const order = await getUserOrder(orderId, session.userId);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/orders" className="text-sm text-ink-700 hover:underline">
          ← Your orders
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">Order #{order.id}</h1>
        <p className="text-sm text-ink-700">
          Placed{" "}
          <time dateTime={order.createdAt.toISOString()}>
            {order.createdAt.toISOString().slice(0, 10)}
          </time>
        </p>
      </div>

      <section aria-label="Items" className="divide-y divide-ink-100 rounded-card bg-surface shadow-sm">
        {order.items.map((item) => (
          <article key={item.id} className="flex gap-4 p-4 sm:p-6">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-muted">
              <Image src={item.imageUrlSnapshot} alt={item.titleSnapshot} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              {item.productSlug ? (
                <Link href={`/product/${item.productSlug}`} className="font-semibold text-ink-900 hover:underline">
                  {item.titleSnapshot}
                </Link>
              ) : (
                <p className="font-semibold text-ink-900">{item.titleSnapshot}</p>
              )}
              <p className="mt-1 text-sm text-ink-700">
                {formatCents(item.unitPriceCents)} × {item.quantity}
              </p>
            </div>
            <p className="shrink-0 text-right font-semibold text-ink-900">
              {formatCents(item.unitPriceCents * item.quantity)}
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-label="Shipping address" className="rounded-card bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-900">Shipping address</h2>
          <p className="mt-2 text-sm text-ink-700">
            {order.shippingName}
            <br />
            {order.shippingLine1}
            {order.shippingLine2 && (
              <>
                <br />
                {order.shippingLine2}
              </>
            )}
            <br />
            {order.shippingCity}, {order.shippingPostalCode}
            <br />
            {order.shippingCountry}
          </p>
        </section>

        <section aria-label="Order summary" className="rounded-card bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-900">Order summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd>{formatCents(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Shipping</dt>
              <dd>{order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Tax</dt>
              <dd>{formatCents(order.taxCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-ink-100 pt-2 text-base font-semibold text-ink-900">
              <dt>Total</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
