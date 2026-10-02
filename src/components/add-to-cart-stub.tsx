"use client";

import { useState } from "react";

/**
 * Add to cart — STUB.
 *
 * Deliberately does not write anything. The real cart is roadmap step 14,
 * where this becomes a Server Action that reads the session server-side and
 * owns the cart row.
 *
 * The quantity selector and disabled-when-out-of-stock behaviour are real, so
 * step 14 only has to replace the click handler, not the markup. The button
 * says what it is rather than pretending to work: a stub that claims success
 * is worse than one that is honest.
 */
export function AddToCartStub({ stock }: { stock: number }) {
  const [quantity, setQuantity] = useState(1);
  const [clicked, setClicked] = useState(false);

  const outOfStock = stock === 0;
  const maxQuantity = Math.min(stock, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm text-ink-700">
          Quantity
        </label>
        <select
          id="quantity"
          value={quantity}
          disabled={outOfStock}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {Array.from({ length: Math.max(1, maxQuantity) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={outOfStock}
        onClick={() => setClicked(true)}
        className="w-full rounded-md bg-amber-accent px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-amber-accent-dark disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
      >
        {outOfStock ? "Out of stock" : "Add to cart"}
      </button>

      {clicked && !outOfStock && (
        <p
          role="status"
          className="rounded-md bg-ink-100 px-3 py-2 text-xs text-ink-800"
        >
          Not wired up yet — the cart arrives in roadmap step 14. Nothing was
          saved.
        </p>
      )}
    </div>
  );
}
