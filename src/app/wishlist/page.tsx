import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/skeletons";
import { WishlistLineActions } from "@/components/wishlist-line-actions";
import { getWishlistItems } from "@/db/queries";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Your wishlist — Kartly" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await requireSession("/login?next=/wishlist");
  const items = await getWishlistItems(session.userId);

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Your wishlist</h1>
        <EmptyState
          title="Nothing saved yet"
          message="Save items from a product page to come back to them later."
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
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Your wishlist</h1>
      <ul className="divide-y divide-ink-100 rounded-card bg-surface shadow-sm">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 p-4 sm:p-6">
            <Link href={`/product/${item.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-surface-muted sm:h-32 sm:w-32">
              <Image src={item.imageUrl} alt={item.title} fill sizes="128px" className="object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-500">{item.brand}</p>
              <Link href={`/product/${item.slug}`} className="font-semibold text-ink-900 hover:underline">
                {item.title}
              </Link>
              <p className="mt-1 text-sm text-ink-700">{formatCents(item.priceCents)}</p>
              {item.stock === 0 && (
                <p className="mt-1 text-sm font-medium text-amber-accent-dark">Out of stock</p>
              )}
              <WishlistLineActions productId={item.productId} outOfStock={item.stock === 0} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
