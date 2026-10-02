"use client";

import { useActionState } from "react";

import {
  removeFromCartAction,
  type CartActionState,
  updateCartQuantityAction,
} from "@/app/actions/cart";

export function CartLineControls({ itemId, quantity, stock }: {
  itemId: number;
  quantity: number;
  stock: number;
}) {
  const [updateState, updateAction, updating] = useActionState<CartActionState, FormData>(
    updateCartQuantityAction,
    null,
  );
  const [removeState, removeAction, removing] = useActionState<CartActionState, FormData>(
    removeFromCartAction,
    null,
  );
  const maxQuantity = Math.min(stock, 10);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {stock > 0 ? (
        <form action={updateAction} className="flex items-center gap-2">
          <input type="hidden" name="itemId" value={itemId} />
          <label htmlFor={`cart-quantity-${itemId}`} className="text-sm text-ink-700">
            Quantity
          </label>
          <select
            id={`cart-quantity-${itemId}`}
            name="quantity"
            defaultValue={Math.min(quantity, maxQuantity)}
            disabled={updating || removing}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="rounded-md border border-ink-200 bg-surface px-2 py-1 text-sm disabled:opacity-50"
          >
            {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <button type="submit" disabled={updating || removing} className="text-sm underline underline-offset-4 hover:text-ink-700 disabled:opacity-50">
            {updating ? "Updating…" : "Update"}
          </button>
        </form>
      ) : (
        <p className="text-sm font-medium text-amber-accent-dark">This item is now out of stock.</p>
      )}

      <form action={removeAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <button type="submit" disabled={updating || removing} className="text-sm underline underline-offset-4 hover:text-ink-700 disabled:opacity-50">
          {removing ? "Removing…" : "Remove"}
        </button>
      </form>

      {(updateState && "error" in updateState) && <p role="alert" className="basis-full text-sm text-amber-accent-dark">{updateState.error}</p>}
      {(removeState && "error" in removeState) && <p role="alert" className="basis-full text-sm text-amber-accent-dark">{removeState.error}</p>}
    </div>
  );
}
