import Image from "next/image";
import Link from "next/link";

import type { ProductCard as ProductCardData } from "@/db/queries";
import { discountPercent, formatCents } from "@/lib/money";

import { AddToCart } from "./add-to-cart";
import { RatingStars } from "./rating-stars";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const percentOff = product.listPriceCents
    ? discountPercent(product.priceCents, product.listPriceCents)
    : 0;
  const outOfStock = product.stock === 0;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-card bg-surface shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          className="object-cover transition duration-300 group-hover:scale-105"
          priority={priority}
        />
        {percentOff > 0 && (
          <span className="absolute left-2 top-2 rounded bg-amber-accent px-2 py-0.5 text-xs font-semibold text-ink-900">
            −{percentOff}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink-900/80 py-1 text-center text-xs font-medium text-ink-50">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs text-ink-500">{product.brand}</p>

        <h3 className="line-clamp-2 text-sm font-medium text-ink-900">
          {/*
            The whole card is the click target: this link is stretched over it
            so the hit area matches what the user perceives, while the DOM
            keeps a single, properly-labelled link for assistive tech.
          */}
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        <p className="flex items-center gap-1 text-xs text-ink-700">
          <RatingStars rating={product.rating} />
          <span>({product.reviewCount.toLocaleString("en-US")})</span>
        </p>

        {/* Price leads the card: bigger and bolder than the title above it,
            with the original price present but visibly secondary. */}
        <p className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-2xl font-extrabold tracking-tight text-ink-900">
            {formatCents(product.priceCents)}
          </span>
          {percentOff > 0 && product.listPriceCents && (
            <span className="text-sm text-ink-500 line-through">
              {formatCents(product.listPriceCents)}
            </span>
          )}
        </p>

        <AddToCart productId={product.id} stock={product.stock} compact />
      </div>
    </li>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  priorityCount?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </ul>
  );
}
