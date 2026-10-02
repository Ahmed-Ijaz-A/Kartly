"use client";

import { useActionState } from "react";

import {
  moveWishlistToCartAction,
  toggleWishlistAction,
  type WishlistActionState,
} from "@/app/actions/wishlist";

export function WishlistLineActions({
  productId,
  outOfStock,
}: {
  productId: number;
  outOfStock: boolean;
}) {
  const [moveState, moveAction, moving] = useActionState<WishlistActionState, FormData>(
    moveWishlistToCartAction,
    null,
  );
  const [removeState, removeAction, removing] = useActionState<WishlistActionState, FormData>(
    toggleWishlistAction,
    null,
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <form action={moveAction}>
        <input type="hidden" name="productId" value={productId} />
        <button
          type="submit"
          disabled={moving || removing || outOfStock}
          className="rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-50 hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          {outOfStock ? "Out of stock" : moving ? "Moving…" : "Move to cart"}
        </button>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="productId" value={productId} />
        <button
          type="submit"
          disabled={moving || removing}
          className="text-sm underline underline-offset-4 hover:text-ink-700 disabled:opacity-50"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </form>
      {moveState && "error" in moveState && (
        <p role="alert" className="basis-full text-sm text-amber-accent-dark">
          {moveState.error}
        </p>
      )}
      {removeState && "error" in removeState && (
        <p role="alert" className="basis-full text-sm text-amber-accent-dark">
          {removeState.error}
        </p>
      )}
    </div>
  );
}
