import Link from "next/link";

import { CheckoutAddressForm } from "@/components/checkout-address-form";
import { EmptyState } from "@/components/skeletons";
import { calculateCartTotals, getCartLines } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Checkout — Kartly" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  await requireSession("/login?next=/checkout");
  const lines = await getCartLines();
  if (lines.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Checkout</h1>
        <EmptyState title="Your cart is empty" message="Add an item before starting checkout." action={<Link href="/search" className="inline-flex rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-50">Browse products</Link>} />
      </div>
    );
  }
  const totals = calculateCartTotals(lines);
  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section><p className="text-sm font-medium text-ink-700">Checkout · 1 of 2</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Delivery address</h1><p className="mt-2 text-sm text-ink-700">Your address is saved before payment, so a payment problem never loses your work.</p><div className="mt-6"><CheckoutAddressForm /></div></section>
      <aside className="h-fit rounded-card bg-surface p-5 shadow-sm"><h2 className="font-semibold text-ink-900">Order summary</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Items</dt><dd>{lines.reduce((total, line) => total + line.quantity, 0)}</dd></div><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(totals.subtotalCents)}</dd></div><div className="flex justify-between"><dt>Shipping</dt><dd>{formatCents(totals.shippingCents)}</dd></div><div className="flex justify-between"><dt>Tax</dt><dd>{formatCents(totals.taxCents)}</dd></div><div className="flex justify-between border-t border-ink-100 pt-2 font-semibold"><dt>Total</dt><dd>{formatCents(totals.totalCents)}</dd></div></dl></aside>
    </div>
  );
}
