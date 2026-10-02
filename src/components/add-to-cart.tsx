"use client";

import { useActionState } from "react";

import { addToCartAction, type CartActionState } from "@/app/actions/cart";

/**
 * Add-to-cart control for the product detail page.
 *
 * A Client Component because it needs useActionState for the pending/success/
 * error states. Everything else on the product page stays server-rendered.
 *
 * The quantity selector is rendered client-side so the selected value stays
 * correct while useActionState re-renders after the action completes.
 */
export function AddToCart({
  productId,
  stock,
  compact = false,
}: {
  productId: number;
  stock: number;
  /** Cards use the one-click form; the product page shows a quantity picker. */
  compact?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<CartActionState, FormData>(
    addToCartAction,
    null,
  );

  const outOfStock = stock === 0;
  const maxQty = Math.min(stock, 10);

  return (
    <form action={formAction} className={compact ? "relative z-10 mt-3" : "space-y-3"}>
      {/* productId is not a security boundary — the action re-validates it
          server-side. It is simply the most convenient way to pass it. */}
      <input type="hidden" name="productId" value={productId} />

      {compact ? (
        <input type="hidden" name="quantity" value="1" />
      ) : (
        <div className="flex items-center gap-3">
          <label htmlFor="add-qty" className="text-sm text-ink-700">
            Quantity
          </label>
          <select
            id="add-qty"
            name="quantity"
            disabled={outOfStock || isPending}
            defaultValue={1}
            className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={outOfStock || isPending}
        className={`${compact ? "w-full px-3 py-2" : "w-full px-5 py-3"} rounded-md bg-amber-accent text-sm font-semibold text-ink-900 transition hover:bg-amber-accent-dark disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500`}
      >
        {outOfStock
          ? "Out of stock"
          : isPending
            ? "Adding…"
            : "Add to cart"}
      </button>

      {state && "success" in state && (
          <p role="status" className="mt-2 rounded-md bg-ink-100 px-3 py-2 text-xs text-ink-800">
          Added to your cart.
        </p>
      )}
      {state && "error" in state && (
          <p role="alert" className="mt-2 rounded-md bg-amber-accent/20 px-3 py-2 text-xs text-ink-900">
          {state.error}
        </p>
      )}
    </form>
  );
}
