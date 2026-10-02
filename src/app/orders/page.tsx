import Link from "next/link";

import { EmptyState } from "@/components/skeletons";
import { getUserOrders } from "@/db/queries";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Your orders — Kartly" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await requireSession("/login?next=/orders");
  const orders = await getUserOrders(session.userId);

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Your orders</h1>
        <EmptyState
          title="No orders yet"
          message="Orders you place will show up here with their items and totals."
          action={
            <Link href="/search" className="inline-flex rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-ink-50 hover:bg-ink-800">
              Browse products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Your orders</h1>
      <ul className="divide-y divide-ink-100 rounded-card bg-surface shadow-sm">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="font-semibold text-ink-900">Order #{order.id}</p>
              <p className="text-sm text-ink-700">
                Placed{" "}
                <time dateTime={order.createdAt.toISOString()}>
                  {order.createdAt.toISOString().slice(0, 10)}
                </time>{" "}
                · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-semibold text-ink-900">{formatCents(order.totalCents)}</p>
              <Link
                href={`/orders/${order.id}`}
                className="rounded-md border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                View order
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
