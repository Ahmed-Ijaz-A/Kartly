"use client";

import Link from "next/link";
import { useActionState } from "react";

import { toggleWishlistAction, type WishlistActionState } from "@/app/actions/wishlist";

/**
 * Heart/save toggle used on the product page and each cart line -- the two
 * places step 22 calls for. A signed-out visitor sees a sign-in link instead
 * of a form that would just error.
 */
export function WishlistToggle({
  productId,
  initialSaved,
  signedIn,
  signInHref,
}: {
  productId: number;
  initialSaved: boolean;
  signedIn: boolean;
  signInHref: string;
}) {
  const [state, formAction, isPending] = useActionState<WishlistActionState, FormData>(
    toggleWishlistAction,
    null,
  );

  if (!signedIn) {
    return (
      <Link href={signInHref} className="text-sm text-ink-700 underline underline-offset-4 hover:text-ink-900">
        Sign in to save
      </Link>
    );
  }

  const saved = state && "saved" in state ? state.saved : initialSaved;

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={isPending}
        aria-pressed={saved}
        className="text-sm font-medium text-ink-700 underline underline-offset-4 hover:text-ink-900 disabled:opacity-50"
      >
        {saved ? "♥ Saved" : "♡ Save for later"}
      </button>
      {state && "error" in state && (
        <p role="alert" className="mt-1 text-xs text-amber-accent-dark">
          {state.error}
        </p>
      )}
    </form>
  );
}
