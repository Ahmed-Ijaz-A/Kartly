import Image from "next/image";
import Link from "next/link";

import { CartLineControls } from "@/components/cart-line-controls";
import { EmptyState } from "@/components/skeletons";
import { WishlistToggle } from "@/components/wishlist-toggle";
import { getWishlistedProductIds } from "@/db/queries";
import { calculateCartTotals, FREE_SHIPPING_THRESHOLD_CENTS, getCartLines } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { getSession } from "@/lib/session";

export const metadata = { title: "Your cart — Kartly" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [lines, session] = await Promise.all([getCartLines(), getSession()]);
  const totals = calculateCartTotals(lines);
  const wishlistedIds = session ? new Set(await getWishlistedProductIds(session.userId)) : new Set<number>();

  if (lines.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Your cart</h1>
        <EmptyState
          title="Your cart is empty"
          message="Find something useful for your everyday. Your saved items will stay here when you return."
          action={<Link href="/search" className="inline-flex rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-ink-50 hover:bg-ink-800">Browse products</Link>}
        />
      </div>
    );
  }

  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
  const shippingMessage = totals.shippingCents === 0
    ? "You qualify for free shipping."
    : `Spend ${formatCents(FREE_SHIPPING_THRESHOLD_CENTS - totals.subtotalCents)} more for free shipping.`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Your cart</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Cart items" className="divide-y divide-ink-100 rounded-card bg-surface shadow-sm">
          {lines.map((line) => (
            <article key={line.id} className="flex gap-4 p-4 sm:p-6">
              <Link href={`/product/${line.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-surface-muted sm:h-32 sm:w-32">
                <Image src={line.imageUrl} alt={line.title} fill sizes="128px" className="object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${line.slug}`} className="font-semibold text-ink-900 hover:underline">{line.title}</Link>
                <p className="mt-1 text-sm text-ink-700">{formatCents(line.priceCents)} each</p>
                <CartLineControls itemId={line.id} quantity={line.quantity} stock={line.stock} />
                <div className="mt-2">
                  <WishlistToggle
                    productId={line.productId}
                    initialSaved={wishlistedIds.has(line.productId)}
                    signedIn={!!session}
                    signInHref="/login?next=/cart"
                  />
                </div>
              </div>
              <p className="shrink-0 text-right font-semibold text-ink-900">{formatCents(line.priceCents * line.quantity)}</p>
            </article>
          ))}
        </section>

        <aside className="rounded-card bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Order summary</h2>
          <p className="mt-1 text-sm text-ink-700">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatCents(totals.subtotalCents)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Shipping</dt><dd>{totals.shippingCents === 0 ? "Free" : formatCents(totals.shippingCents)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Estimated tax</dt><dd>{formatCents(totals.taxCents)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-ink-100 pt-3 text-base font-semibold text-ink-900"><dt>Order total</dt><dd>{formatCents(totals.totalCents)}</dd></div>
          </dl>
          <p className="mt-4 rounded-md bg-ink-100 px-3 py-2 text-xs text-ink-800">{shippingMessage} Flat tax and shipping are confirmed at checkout.</p>
          <Link href="/checkout" className="mt-5 block w-full rounded-md bg-ink-900 px-4 py-3 text-center text-sm font-semibold text-ink-50 hover:bg-ink-800">Proceed to checkout</Link>
        </aside>
      </div>
    </div>
  );
}
