"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { ProductCard as ProductCardData } from "@/db/queries";

import { ProductCard } from "./product-card";

const CARD_WIDTH_CLASS = "w-[72%] sm:w-[46%] md:w-[31%] lg:w-[23%] xl:w-[19%]";

/**
 * Horizontally-scrolling product rail for the home page. A Client Component
 * because the arrow buttons drive the scroll position directly -- the only
 * interactivity on an otherwise server-rendered home page.
 */
export function ProductRail({
  products,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  priorityCount?: number;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  // onScroll alone never fires when the cards already fit without
  // overflowing (nothing to scroll), which would otherwise leave the right
  // arrow looking active with nothing for it to do. Check on mount and
  // whenever the viewport is resized across a breakpoint.
  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [products.length]);

  function scroll(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step * 2, behavior: "smooth" });
  }

  return (
    <div className="group/rail relative">
      <ul
        ref={scrollerRef}
        onScroll={updateEdges}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < priorityCount}
            className={`${CARD_WIDTH_CLASS} shrink-0 snap-start`}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={atStart}
        aria-label="Scroll left"
        className="absolute -left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-surface p-2 text-ink-900 shadow-md ring-1 ring-ink-100 transition hover:scale-110 hover:bg-amber-accent disabled:pointer-events-none disabled:opacity-0 sm:flex"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={atEnd}
        aria-label="Scroll right"
        className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-surface p-2 text-ink-900 shadow-md ring-1 ring-ink-100 transition hover:scale-110 hover:bg-amber-accent disabled:pointer-events-none disabled:opacity-0 sm:flex"
      >
        <ChevronRightIcon className="h-5 w-5 motion-safe:animate-[rail-nudge_1.6s_ease-in-out_infinite]" />
      </button>
    </div>
  );
}
