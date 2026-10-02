import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-card";
import { RatingStars } from "@/components/rating-stars";
import { ReviewForm } from "@/components/review-form";
import { RailSkeleton } from "@/components/skeletons";
import { WishlistToggle } from "@/components/wishlist-toggle";
import {
  getProductBySlug,
  getProductReviews,
  getRelatedProducts,
  getReviewHistogram,
  getWishlistedProductIds,
} from "@/db/queries";
import { discountPercent, formatCents } from "@/lib/money";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found — Kartly" };
  return {
    title: `${product.title} — Kartly`,
    description: product.description.slice(0, 160),
  };
}

/** attributes is stored as a JSON object string; bad data must not 500 the page. */
function parseAttributes(raw: string): [string, string][] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" && value.length > 0)
      .map(([key, value]) => [key, value as string]);
  } catch {
    return [];
  }
}

function StockLine({ stock }: { stock: number }) {
  if (stock === 0) {
    return <p className="text-sm font-medium text-ink-700">Currently out of stock</p>;
  }
  if (stock <= 10) {
    return (
      <p className="text-sm font-medium text-amber-accent-dark">
        Only {stock} left in stock — order soon
      </p>
    );
  }
  return <p className="text-sm font-medium text-ink-700">In stock</p>;
}

async function Reviews({ productId, rating, reviewCount, signedIn, productSlug }: {
  productId: number;
  rating: number;
  reviewCount: number;
  signedIn: boolean;
  productSlug: string;
}) {
  const [reviews, histogram] = await Promise.all([
    getProductReviews(productId),
    getReviewHistogram(productId),
  ]);

  const histogramTotal = Object.values(histogram).reduce((sum, n) => sum + n, 0);

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <h2 id="reviews-heading" className="text-xl font-semibold text-ink-900">
        Customer reviews
      </h2>

      <div className="grid gap-8 md:grid-cols-[18rem_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RatingStars rating={rating} size="lg" />
            <span className="text-sm text-ink-700">{rating.toFixed(1)} out of 5</span>
          </div>
          <p className="text-sm text-ink-700">
            {reviewCount.toLocaleString("en-US")} global ratings
          </p>

          {histogramTotal > 0 ? (
            <ul className="space-y-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = histogram[stars] ?? 0;
                const percent = Math.round((count / histogramTotal) * 100);
                return (
                  <li key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-ink-700">{stars} star</span>
                    <span className="h-3 flex-1 overflow-hidden rounded bg-ink-100">
                      <span
                        className="block h-full bg-amber-accent"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-8 text-right text-ink-700">{percent}%</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-700">
              No written reviews yet for this product.
            </p>
          )}
        </div>

        {reviews.length > 0 ? (
          <ul className="space-y-6">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-ink-100 pb-6 last:border-b-0">
                <div className="flex items-center gap-2">
                  <RatingStars rating={review.rating} />
                  <h3 className="text-sm font-semibold text-ink-900">{review.title}</h3>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {review.authorName} ·{" "}
                  <time dateTime={review.createdAt.toISOString()}>
                    {review.createdAt.toISOString().slice(0, 10)}
                  </time>
                </p>
                <p className="mt-2 text-sm text-ink-800">{review.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-700">
            Nobody has written about this one yet. The rating above comes from
            aggregate scores.
          </p>
        )}
      </div>

      <div className="border-t border-ink-100 pt-6">
        <h3 className="text-base font-semibold text-ink-900">Write a review</h3>
        {signedIn ? (
          <ReviewForm productId={productId} />
        ) : (
          <p className="mt-2 text-sm text-ink-700">
            <Link
              href={`/login?next=/product/${productSlug}`}
              className="font-medium text-ink-900 underline underline-offset-4 hover:text-ink-700"
            >
              Sign in
            </Link>{" "}
            to write a review.
          </p>
        )}
      </div>
    </section>
  );
}

async function RelatedProducts({
  categoryId,
  productId,
  categoryName,
}: {
  categoryId: number;
  productId: number;
  categoryName: string;
}) {
  const related = await getRelatedProducts(categoryId, productId, 4);
  if (related.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-ink-900">
        More in {categoryName}
      </h2>
      <ProductGrid products={related} />
    </section>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const session = await getSession();
  const wishlisted = session
    ? (await getWishlistedProductIds(session.userId)).includes(product.id)
    : false;

  const images = [product.imageUrl, ...product.extraImages].filter(Boolean);
  const attributes = parseAttributes(product.attributes);
  const percentOff = product.listPriceCents
    ? discountPercent(product.priceCents, product.listPriceCents)
    : 0;

  return (
    <div className="space-y-12">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-700">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-ink-900 hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/search?category=${product.categorySlug}`}
              className="hover:text-ink-900 hover:underline"
            >
              {product.categoryName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink-900" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={images} title={product.title} />

        <div className="space-y-5">
          <div>
            <p className="text-sm text-ink-500">{product.brand}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              {product.title}
            </h1>
          </div>

          <a
            href="#reviews-heading"
            className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900"
          >
            <RatingStars rating={product.rating} />
            <span>
              {product.rating.toFixed(1)} ·{" "}
              {product.reviewCount.toLocaleString("en-US")} ratings
            </span>
          </a>

          <div className="border-y border-ink-100 py-5">
            {/*
              Price is the single most prominent element on this page --
              larger and heavier than the product title above it. The
              discounted price leads at full weight; the original price is
              present but deliberately secondary (smaller, muted, struck
              through), the way a shopper scans "what do I pay" before "what
              did this used to cost".
            */}
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="text-5xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
                {formatCents(product.priceCents)}
              </span>
              {percentOff > 0 && product.listPriceCents && (
                <>
                  <span className="text-lg text-ink-500 line-through">
                    {formatCents(product.listPriceCents)}
                  </span>
                  <span className="rounded bg-amber-accent px-2.5 py-1 text-sm font-bold text-ink-900">
                    Save {percentOff}%
                  </span>
                </>
              )}
            </p>
            <div className="mt-3">
              <StockLine stock={product.stock} />
            </div>
          </div>

          <AddToCart productId={product.id} stock={product.stock} />

          <WishlistToggle
            productId={product.id}
            initialSaved={wishlisted}
            signedIn={!!session}
            signInHref={`/login?next=/product/${product.slug}`}
          />

          <div>
            <h2 className="text-sm font-semibold text-ink-900">About this item</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-800">
              {product.description}
            </p>
          </div>

          {attributes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Details</h2>
              <dl className="mt-2 divide-y divide-ink-100 text-sm">
                {attributes.map(([key, value]) => (
                  <div key={key} className="flex gap-4 py-2">
                    <dt className="w-32 shrink-0 text-ink-500">{key}</dt>
                    <dd className="text-ink-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <Suspense fallback={<RailSkeleton />}>
        <Reviews
          productId={product.id}
          rating={product.rating}
          reviewCount={product.reviewCount}
          signedIn={!!session}
          productSlug={product.slug}
        />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <RelatedProducts
          categoryId={product.categoryId}
          productId={product.id}
          categoryName={product.categoryName}
        />
      </Suspense>
    </div>
  );
}
