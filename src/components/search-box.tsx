"use client";

import { useSearchParams } from "next/navigation";

/**
 * Header search.
 *
 * A plain GET form, not a controlled input with a router.push: the browser
 * builds /search?q=... itself, which means it works before hydration and keeps
 * the URL the single source of truth.
 *
 * defaultValue (not value) so the field shows the active query on a search
 * results page without this becoming controlled state.
 */
export function SearchBox() {
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";

  return (
    <form action="/search" method="get" role="search" className="flex flex-1 items-center">
      <label htmlFor="site-search" className="sr-only">
        Search Kartly
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={currentQuery}
        placeholder="Search Kartly"
        autoComplete="off"
        className="h-10 w-full rounded-l-md border-0 bg-surface px-3 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:ring-2 focus:ring-amber-accent"
      />
      <button
        type="submit"
        className="h-10 rounded-r-md bg-amber-accent px-4 text-sm font-semibold text-ink-900 transition hover:bg-amber-accent-dark focus:outline-none focus:ring-2 focus:ring-ink-50"
      >
        Search
      </button>
    </form>
  );
}
