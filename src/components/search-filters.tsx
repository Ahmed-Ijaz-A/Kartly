import Link from "next/link";

import {
  buildSearchHref,
  hasActiveFilters,
  SORT_OPTIONS,
  type SearchFilters,
} from "@/lib/search-params";
import { formatCents } from "@/lib/money";

type Category = { id: number; slug: string; name: string };

/**
 * Filters are links and a GET form, not client state.
 *
 * Every control navigates to a new URL, so the server re-renders the results,
 * the back button works, and a copied link reproduces the exact view. There is
 * no filter state held in React at all.
 */

const PRICE_BANDS: readonly { label: string; min: number | null; max: number | null }[] = [
  { label: "Under $25", min: null, max: 2499 },
  { label: "$25 to $75", min: 2500, max: 7499 },
  { label: "$75 to $150", min: 7500, max: 14999 },
  { label: "$150 to $300", min: 15000, max: 29999 },
  { label: "$300 & above", min: 30000, max: null },
];

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ink-100 py-4 first:pt-0 last:border-b-0">
      <h3 className="mb-2 text-sm font-semibold text-ink-900">{title}</h3>
      {children}
    </div>
  );
}

export function ActiveFilterChips({
  filters,
  categories,
}: {
  filters: SearchFilters;
  categories: Category[];
}) {
  if (!hasActiveFilters(filters)) return null;

  const chips: { label: string; href: string }[] = [];

  if (filters.category) {
    const name =
      categories.find((c) => c.slug === filters.category)?.name ?? filters.category;
    chips.push({ label: name, href: buildSearchHref(filters, { category: "" }) });
  }

  if (filters.minCents !== null || filters.maxCents !== null) {
    const min = filters.minCents === null ? "Under" : formatCents(filters.minCents);
    const max = filters.maxCents === null ? "and up" : formatCents(filters.maxCents);
    const label =
      filters.minCents === null
        ? `Under ${formatCents(filters.maxCents ?? 0)}`
        : filters.maxCents === null
          ? `${min} and up`
          : `${min} – ${max}`;
    chips.push({
      label,
      href: buildSearchHref(filters, { minCents: null, maxCents: null }),
    });
  }

  if (filters.rating !== null) {
    chips.push({
      label: `${filters.rating}★ & up`,
      href: buildSearchHref(filters, { rating: null }),
    });
  }

  if (filters.inStock) {
    chips.push({
      label: "In stock",
      href: buildSearchHref(filters, { inStock: false }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-700">Filters:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-800 transition hover:bg-ink-200"
        >
          {chip.label}
          <span aria-hidden="true">×</span>
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={buildSearchHref(filters, {
            category: "",
            minCents: null,
            maxCents: null,
            rating: null,
            inStock: false,
          })}
          className="text-xs font-medium text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}

export function SortControl({ filters }: { filters: SearchFilters }) {
  return (
    <form action="/search" method="get" className="flex items-center gap-2">
      {/* Carry the rest of the query across, so sorting never silently drops
          the user's filters. */}
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.category && <input type="hidden" name="category" value={filters.category} />}
      {filters.minCents !== null && (
        <input type="hidden" name="min" value={filters.minCents / 100} />
      )}
      {filters.maxCents !== null && (
        <input type="hidden" name="max" value={filters.maxCents / 100} />
      )}
      {filters.rating !== null && (
        <input type="hidden" name="rating" value={filters.rating} />
      )}
      {filters.inStock && <input type="hidden" name="instock" value="1" />}

      <label htmlFor="sort" className="text-sm text-ink-700">
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={filters.sort}
        className="rounded-md border border-ink-200 bg-surface px-2 py-1.5 text-sm text-ink-900"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Submit button kept for no-JS and keyboard users; a select alone would
          need an onChange handler and therefore client state. */}
      <button
        type="submit"
        className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-800 transition hover:bg-ink-100"
      >
        Apply
      </button>
    </form>
  );
}

export function FilterSidebar({
  filters,
  categories,
}: {
  filters: SearchFilters;
  categories: Category[];
}) {
  return (
    <aside aria-label="Filters" className="rounded-card bg-surface p-4">
      <FilterSection title="Category">
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href={buildSearchHref(filters, { category: "" })}
              className={`block rounded px-2 py-1 transition hover:bg-ink-100 ${
                filters.category === "" ? "font-semibold text-ink-900" : "text-ink-700"
              }`}
              aria-current={filters.category === "" ? "true" : undefined}
            >
              All categories
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={buildSearchHref(filters, { category: category.slug })}
                className={`block rounded px-2 py-1 transition hover:bg-ink-100 ${
                  filters.category === category.slug
                    ? "font-semibold text-ink-900"
                    : "text-ink-700"
                }`}
                aria-current={filters.category === category.slug ? "true" : undefined}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Price">
        <ul className="space-y-1 text-sm">
          {PRICE_BANDS.map((band) => {
            const active =
              filters.minCents === band.min && filters.maxCents === band.max;
            return (
              <li key={band.label}>
                <Link
                  href={buildSearchHref(filters, {
                    minCents: active ? null : band.min,
                    maxCents: active ? null : band.max,
                  })}
                  className={`block rounded px-2 py-1 transition hover:bg-ink-100 ${
                    active ? "font-semibold text-ink-900" : "text-ink-700"
                  }`}
                  aria-current={active ? "true" : undefined}
                >
                  {band.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Custom range, as a GET form so it needs no client state either. */}
        <form action="/search" method="get" className="mt-3 flex items-end gap-2">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {filters.category && (
            <input type="hidden" name="category" value={filters.category} />
          )}
          {filters.rating !== null && (
            <input type="hidden" name="rating" value={filters.rating} />
          )}
          {filters.inStock && <input type="hidden" name="instock" value="1" />}
          {filters.sort !== "relevance" && (
            <input type="hidden" name="sort" value={filters.sort} />
          )}

          <div className="flex-1">
            <label htmlFor="min-price" className="block text-xs text-ink-700">
              Min $
            </label>
            <input
              id="min-price"
              name="min"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={filters.minCents !== null ? filters.minCents / 100 : ""}
              className="w-full rounded-md border border-ink-200 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="max-price" className="block text-xs text-ink-700">
              Max $
            </label>
            <input
              id="max-price"
              name="max"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={filters.maxCents !== null ? filters.maxCents / 100 : ""}
              className="w-full rounded-md border border-ink-200 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-800 transition hover:bg-ink-100"
          >
            Go
          </button>
        </form>
      </FilterSection>

      <FilterSection title="Customer rating">
        <ul className="space-y-1 text-sm">
          {[4, 3, 2, 1].map((stars) => {
            const active = filters.rating === stars;
            return (
              <li key={stars}>
                <Link
                  href={buildSearchHref(filters, { rating: active ? null : stars })}
                  className={`block rounded px-2 py-1 transition hover:bg-ink-100 ${
                    active ? "font-semibold text-ink-900" : "text-ink-700"
                  }`}
                  aria-current={active ? "true" : undefined}
                >
                  {stars}★ &amp; up
                </Link>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      <FilterSection title="Availability">
        <Link
          href={buildSearchHref(filters, { inStock: !filters.inStock })}
          className={`block rounded px-2 py-1 text-sm transition hover:bg-ink-100 ${
            filters.inStock ? "font-semibold text-ink-900" : "text-ink-700"
          }`}
          aria-current={filters.inStock ? "true" : undefined}
        >
          {filters.inStock ? "✓ " : ""}In stock only
        </Link>
      </FilterSection>
    </aside>
  );
}

export function Pagination({
  filters,
  page,
  pageCount,
}: {
  filters: SearchFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  // A window around the current page, so 21 pages do not render 21 links.
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const linkClass =
    "rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium transition hover:bg-ink-100";

  return (
    <nav aria-label="Search results pages" className="flex flex-wrap items-center gap-2">
      {page > 1 && (
        <Link href={buildSearchHref(filters, { page: page - 1 })} className={linkClass}>
          ← Previous
        </Link>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildSearchHref(filters, { page: p })}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? "rounded-md bg-ink-900 px-3 py-1.5 text-sm font-semibold text-ink-50"
              : linkClass
          }
        >
          {p}
        </Link>
      ))}

      {page < pageCount && (
        <Link href={buildSearchHref(filters, { page: page + 1 })} className={linkClass}>
          Next →
        </Link>
      )}

      <span className="ml-2 text-sm text-ink-700">
        Page {page} of {pageCount}
      </span>
    </nav>
  );
}
