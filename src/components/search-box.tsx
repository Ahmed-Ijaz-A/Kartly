"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { SearchSuggestion } from "@/db/queries";
import { formatCents } from "@/lib/money";

const DEBOUNCE_MS = 200;

/**
 * Header search.
 *
 * Still a plain GET form underneath -- the browser builds /search?q=...
 * itself, so it works before hydration and the URL stays the single source
 * of truth for the actual search. The as-you-type dropdown on top of it is
 * local, ephemeral UI state (open/closed, which row is highlighted) that
 * never substitutes for that: picking a suggestion just navigates, same as
 * submitting the form would.
 *
 * defaultValue (not value) so the field shows the active query on a search
 * results page without the input itself becoming controlled.
 */
export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function fetchSuggestions(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: { suggestions: SearchSuggestion[] } = await response.json();
        setSuggestions(data.suggestions);
        setHighlighted(-1);
        setOpen(data.suggestions.length > 0);
      } catch {
        // Aborted or offline -- leave whatever was showing alone.
      }
    }, DEBOUNCE_MS);
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    setOpen(false);
    router.push(`/product/${suggestion.slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[highlighted]);
    }
  }

  const activeId = highlighted >= 0 ? `search-suggestion-${highlighted}` : undefined;

  return (
    <div ref={containerRef} className="relative flex-1">
      <form action="/search" method="get" role="search" className="flex items-center" autoComplete="off">
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
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          onChange={(event) => fetchSuggestions(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            if (suggestions.length > 0 && event.target.value.trim().length >= 2) setOpen(true);
          }}
          className="h-10 w-full rounded-l-md border-0 bg-surface px-3 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:ring-2 focus:ring-amber-accent"
        />
        <button
          type="submit"
          className="h-10 rounded-r-md bg-amber-accent px-4 text-sm font-semibold text-ink-900 transition hover:bg-amber-accent-dark focus:outline-none focus:ring-2 focus:ring-ink-50"
        >
          Search
        </button>
      </form>

      {open && (
        <ul
          id="search-suggestions-listbox"
          role="listbox"
          className="absolute left-0 right-12 top-full z-50 mt-1 overflow-hidden rounded-md bg-surface py-1 text-ink-900 shadow-lg ring-1 ring-ink-100"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`search-suggestion-${index}`}
              role="option"
              aria-selected={index === highlighted}
            >
              <Link
                href={`/product/${suggestion.slug}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex items-center gap-3 px-3 py-2 text-sm ${
                  index === highlighted ? "bg-surface-muted" : ""
                }`}
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-muted">
                  <Image src={suggestion.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink-900">{suggestion.title}</span>
                  <span className="block truncate text-xs text-ink-500">{suggestion.brand}</span>
                </span>
                <span className="shrink-0 font-semibold text-ink-900">
                  {formatCents(suggestion.priceCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
