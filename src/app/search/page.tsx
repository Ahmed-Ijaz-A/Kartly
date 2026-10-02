import Link from "next/link";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product-card";
import {
  ActiveFilterChips,
  FilterSidebar,
  Pagination,
  SortControl,
} from "@/components/search-filters";
import { EmptyState, ProductGridSkeleton } from "@/components/skeletons";
import { getCategories, searchProducts } from "@/db/queries";
import {
  buildSearchHref,
  hasActiveFilters,
  parseSearchParams,
  type RawSearchParams,
} from "@/lib/search-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseSearchParams(await searchParams);
  return {
    title: filters.q ? `${filters.q} — Kartly search` : "Browse everything — Kartly",
  };
}

async function Results({ filters }: { filters: ReturnType<typeof parseSearchParams> }) {
  const { products, total, page, pageCount } = await searchProducts(filters);

  if (products.length === 0) {
    const filtered = hasActiveFilters(filters);

    return (
      <EmptyState
        title={filters.q ? `No results for “${filters.q}”` : "No products match these filters"}
        message={
          filtered
            ? "Try removing a filter, or widening the price range. Your search term may also be narrower than the catalogue."
            : "Check the spelling, or try a more general word — for example “headphones” rather than a specific model."
        }
        action={
          <div className="flex flex-wrap justify-center gap-3">
            {filtered && (
              <Link
                href={buildSearchHref(filters, {
                  category: "",
                  minCents: null,
                  maxCents: null,
                  rating: null,
                  inStock: false,
                })}
                className="rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-50 transition hover:bg-ink-800"
              >
                Clear all filters
              </Link>
            )}
            <Link
              href="/search"
              className="rounded-md border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-ink-100"
            >
              Browse everything
            </Link>
          </div>
        }
      />
    );
  }

  const firstIndex = (page - 1) * products.length + 1;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-700" aria-live="polite">
        Showing <strong className="text-ink-900">{firstIndex}</strong>–
        <strong className="text-ink-900">{firstIndex + products.length - 1}</strong> of{" "}
        <strong className="text-ink-900">{total.toLocaleString("en-US")}</strong>{" "}
        {total === 1 ? "result" : "results"}
        {filters.q && (
          <>
            {" "}
            for <strong className="text-ink-900">“{filters.q}”</strong>
          </>
        )}
      </p>

      <ProductGrid products={products} priorityCount={4} />

      <Pagination filters={filters} page={page} pageCount={pageCount} />
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseSearchParams(await searchParams);
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          {filters.q ? `Results for “${filters.q}”` : "Browse everything"}
        </h1>
        <SortControl filters={filters} />
      </div>

      <ActiveFilterChips filters={filters} categories={categories} />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* On mobile the sidebar collapses into a disclosure so it does not
            push the results below the fold. */}
        <details className="rounded-card bg-surface lg:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink-900">
            Filters
          </summary>
          <div className="px-2 pb-2">
            <FilterSidebar filters={filters} categories={categories} />
          </div>
        </details>

        <div className="hidden lg:block">
          <FilterSidebar filters={filters} categories={categories} />
        </div>

        {/* Keyed so changing the query re-triggers the skeleton rather than
            holding the previous results while the new ones load. */}
        <Suspense
          key={JSON.stringify(filters)}
          fallback={<ProductGridSkeleton count={12} />}
        >
          <Results filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}
