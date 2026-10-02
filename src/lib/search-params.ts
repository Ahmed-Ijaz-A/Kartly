/**
 * Search state lives entirely in the URL.
 *
 * This module is the single place raw query strings become a typed, validated
 * filter object, and the single place a filter object becomes a URL again.
 * Nothing else should read searchParams directly -- that is what keeps the
 * back button, shared links and server rendering all agreeing.
 *
 * Every value arriving here is untrusted input and is clamped or discarded.
 */

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Average rating" },
  { value: "newest", label: "Newest arrivals" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as readonly string[];

export const PAGE_SIZE = 24;

export type SearchFilters = {
  q: string;
  category: string;
  /** Inclusive price bounds, in integer cents. null means unbounded. */
  minCents: number | null;
  maxCents: number | null;
  /** Minimum average rating, 1-4. null means no rating filter. */
  rating: number | null;
  inStock: boolean;
  sort: SortValue;
  page: number;
};

/** Next.js hands searchParams through as string | string[] | undefined. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Parse a price written in dollars into integer cents.
 * Returns null for anything non-numeric, negative or absurd.
 */
function parseDollarsToCents(raw: string): number | null {
  if (!raw.trim()) return null;
  const dollars = Number(raw);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.min(Math.round(dollars * 100), 100_000_00);
}

export function parseSearchParams(raw: RawSearchParams): SearchFilters {
  const minCents = parseDollarsToCents(first(raw.min));
  const maxCents = parseDollarsToCents(first(raw.max));

  const ratingRaw = Number(first(raw.rating));
  const rating =
    Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 4 ? ratingRaw : null;

  const pageRaw = Number(first(raw.page));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, 500) : 1;

  const sortRaw = first(raw.sort);
  const sort = (SORT_VALUES.includes(sortRaw) ? sortRaw : "relevance") as SortValue;

  // A reversed range is a user slip, not an error worth a page for: swap it.
  const bounded =
    minCents !== null && maxCents !== null && minCents > maxCents
      ? { minCents: maxCents, maxCents: minCents }
      : { minCents, maxCents };

  return {
    q: first(raw.q).trim().slice(0, 120),
    category: first(raw.category).trim().slice(0, 80),
    ...bounded,
    rating,
    inStock: first(raw.instock) === "1",
    sort,
    page,
  };
}

/**
 * Build a search URL from the current filters plus an override.
 * Defaults are omitted so shared URLs stay short and readable.
 */
export function buildSearchHref(
  filters: SearchFilters,
  overrides: Partial<SearchFilters> = {},
): string {
  const next = { ...filters, ...overrides };

  // Any filter change invalidates the current page number, unless the caller
  // is explicitly paginating.
  if (overrides.page === undefined && hasFilterChanged(filters, overrides)) {
    next.page = 1;
  }

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.minCents !== null) params.set("min", String(next.minCents / 100));
  if (next.maxCents !== null) params.set("max", String(next.maxCents / 100));
  if (next.rating !== null) params.set("rating", String(next.rating));
  if (next.inStock) params.set("instock", "1");
  if (next.sort !== "relevance") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function hasFilterChanged(
  filters: SearchFilters,
  overrides: Partial<SearchFilters>,
): boolean {
  return (Object.keys(overrides) as (keyof SearchFilters)[]).some(
    (key) => overrides[key] !== filters[key],
  );
}

/** True when anything is narrowing the catalogue beyond a bare keyword. */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    Boolean(filters.category) ||
    filters.minCents !== null ||
    filters.maxCents !== null ||
    filters.rating !== null ||
    filters.inStock
  );
}
