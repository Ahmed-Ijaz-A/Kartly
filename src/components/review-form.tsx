"use client";

import { useActionState } from "react";

import { submitReviewAction, type ReviewActionState } from "@/app/actions/reviews";

export function ReviewForm({ productId }: { productId: number }) {
  const [state, formAction, isPending] = useActionState<ReviewActionState, FormData>(
    submitReviewAction,
    null,
  );

  return (
    <form action={formAction} className="mt-3 max-w-md space-y-3">
      <input type="hidden" name="productId" value={productId} />

      <div>
        <label htmlFor="review-rating" className="block text-sm font-medium text-ink-900">
          Your rating
        </label>
        <select
          id="review-rating"
          name="rating"
          defaultValue={5}
          disabled={isPending}
          className="mt-1 rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="review-title" className="block text-sm font-medium text-ink-900">
          Title
        </label>
        <input
          id="review-title"
          name="title"
          type="text"
          required
          maxLength={200}
          disabled={isPending}
          className="mt-1 w-full rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="block text-sm font-medium text-ink-900">
          Review
        </label>
        <textarea
          id="review-body"
          name="body"
          required
          maxLength={2_000}
          rows={4}
          disabled={isPending}
          className="mt-1 w-full rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-50 hover:bg-ink-800 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit review"}
      </button>

      {state && "success" in state && (
        <p role="status" className="text-sm text-ink-700">
          Thanks — your review was posted.
        </p>
      )}
      {state && "error" in state && (
        <p role="alert" className="text-sm text-amber-accent-dark">
          {state.error}
        </p>
      )}
    </form>
  );
}
