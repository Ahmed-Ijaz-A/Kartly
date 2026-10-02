import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product-card";
import { EmptyState, RailSkeleton } from "@/components/skeletons";
import {
  getCategories,
  getDealProducts,
  getFeaturedProducts,
  getProductCount,
  getTopRatedProducts,
  type ProductCard,
} from "@/db/queries";

export const dynamic = "force-dynamic";

/**
 * Six Unsplash images used purely as decorative mosaic in the hero.
 * Same stable URLs already approved in next.config.ts for category tiles.
 */
const HERO_MOSAIC = [
  // col 0 — no offset
  { url: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&q=80&auto=format&fit=crop", size: "h-32 w-32" },
  { url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&q=80&auto=format&fit=crop", size: "h-24 w-24" },
  // col 1 — drops down (mt-10)
  { url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&q=80&auto=format&fit=crop", size: "h-24 w-24" },
  { url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&q=80&auto=format&fit=crop", size: "h-32 w-32" },
  // col 2 — slight drop (mt-4)
  { url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80&auto=format&fit=crop", size: "h-28 w-28" },
  { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80&auto=format&fit=crop", size: "h-24 w-24" },
];

function Hero({ productCount, categoryCount }: { productCount: number; categoryCount: number }) {
  return (
    <section className="overflow-hidden rounded-card bg-ink-900 px-6 py-12 text-ink-50 sm:px-10 sm:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">

        {/* Left — headline and CTAs */}
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-amber-accent">
            Kartly
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Everyday things,<br className="hidden sm:block" /> chosen well
          </h1>
          <p className="mt-4 max-w-lg text-base text-ink-200">
            {productCount.toLocaleString("en-US")} products across {categoryCount}{" "}
            categories — electronics, home, outdoors, books and more. No endless
            aisles, just things worth owning.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-md bg-amber-accent px-5 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-amber-accent-dark"
            >
              Browse everything
            </Link>
            <Link
              href="/search?sort=price-asc&instock=1"
              className="rounded-md border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-50 transition hover:bg-ink-800"
            >
              Best value first
            </Link>
          </div>
        </div>

        {/* Right — staggered image mosaic (desktop only, purely decorative) */}
        <div className="hidden lg:flex lg:items-center lg:justify-end" aria-hidden="true">
          <div className="flex gap-4">
            {/* Column 0 — sits at top */}
            <div className="flex flex-col gap-4">
              {HERO_MOSAIC.slice(0, 2).map(({ url, size }, i) => (
                <div key={i} className={`relative ${size} overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10`}>
                  <Image src={url} alt="" fill sizes="160px" className="object-cover" />
                </div>
              ))}
            </div>
            {/* Column 1 — drops down */}
            <div className="mt-10 flex flex-col gap-4">
              {HERO_MOSAIC.slice(2, 4).map(({ url, size }, i) => (
                <div key={i} className={`relative ${size} overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10`}>
                  <Image src={url} alt="" fill sizes="160px" className="object-cover" />
                </div>
              ))}
            </div>
            {/* Column 2 — slight drop */}
            <div className="mt-4 flex flex-col gap-4">
              {HERO_MOSAIC.slice(4, 6).map(({ url, size }, i) => (
                <div key={i} className={`relative ${size} overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10`}>
                  <Image src={url} alt="" fill sizes="160px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

async function CategoryTiles() {
  const categories = await getCategories();

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No categories yet"
        message="Run npm run db:seed to load the catalogue."
      />
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-ink-900">Shop by category</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <li
            key={category.id}
            className="group relative overflow-hidden rounded-card bg-surface shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-4/3 bg-surface-muted">
              <Image
                src={category.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-ink-900">
                {/* Category tiles route into search, which already handles
                    filtering, sorting and pagination. A dedicated
                    /category/[slug] route would duplicate all of it. */}
                <Link
                  href={`/search?category=${category.slug}`}
                  className="after:absolute after:inset-0"
                >
                  {category.name}
                </Link>
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-ink-700">
                {category.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Rail({
  title,
  description,
  href,
  products,
  priorityCount = 0,
}: {
  title: string;
  description: string;
  href: string;
  products: ProductCard[];
  priorityCount?: number;
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <p className="text-sm text-ink-700">{description}</p>
        </div>
        <Link
          href={href}
          className="text-sm font-medium text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          See all
        </Link>
      </div>
      <ProductGrid products={products} priorityCount={priorityCount} />
    </section>
  );
}

async function FeaturedRail() {
  const products = await getFeaturedProducts(4);
  return (
    <Rail
      title="Picked by us"
      description="A short list we would actually recommend."
      href="/search?sort=rating"
      products={products}
      priorityCount={4}
    />
  );
}

async function DealsRail() {
  const products = await getDealProducts(4);
  return (
    <Rail
      title="Biggest savings"
      description="Ranked by percentage off, not by sticker size."
      href="/search?sort=price-asc"
      products={products}
    />
  );
}

async function TopRatedRail() {
  const products = await getTopRatedProducts(4);
  return (
    <Rail
      title="Highly rated, widely bought"
      description="Strong ratings with enough reviews to mean something."
      href="/search?sort=rating"
      products={products}
    />
  );
}

async function HeroSection() {
  const [productCount, categories] = await Promise.all([getProductCount(), getCategories()]);
  return <Hero productCount={productCount} categoryCount={categories.length} />;
}

export default function HomePage() {
  return (
    <div className="space-y-12">
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-card bg-ink-100" />}
      >
        <HeroSection />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <CategoryTiles />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <FeaturedRail />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <DealsRail />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <TopRatedRail />
      </Suspense>
    </div>
  );
}
