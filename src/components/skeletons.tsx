/**
 * Loading skeletons.
 *
 * Shapes mirror the real content's layout so the page does not jump when data
 * arrives. aria-hidden throughout: a screen reader should hear the eventual
 * content, not a description of grey boxes.
 */

export function ProductCardSkeleton() {
  return (
    <li className="overflow-hidden rounded-card bg-surface shadow-sm" aria-hidden="true">
      <div className="aspect-square animate-pulse bg-ink-100" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-ink-100" />
      </div>
    </li>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </ul>
  );
}

export function RailSkeleton() {
  return (
    <section className="space-y-4" aria-hidden="true">
      <div className="h-6 w-48 animate-pulse rounded bg-ink-100" />
      <ProductGridSkeleton count={4} />
    </section>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true">
      <div className="aspect-square animate-pulse rounded-card bg-ink-100" />
      <div className="space-y-4">
        <div className="h-4 w-1/4 animate-pulse rounded bg-ink-100" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-ink-100" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-ink-100" />
        <div className="h-10 w-1/3 animate-pulse rounded bg-ink-100" />
        <div className="h-24 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-12 w-full animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  );
}

/** A page's <h1> while its data is still loading. */
export function HeadingSkeleton({ width = "w-48" }: { width?: string }) {
  return <div className={`h-8 ${width} animate-pulse rounded bg-ink-100`} aria-hidden="true" />;
}

/**
 * Rows of thumbnail + two text lines + a trailing price -- the shape shared
 * by the cart, order history, order detail and wishlist lists. One skeleton
 * for all four rather than four near-identical copies.
 */
export function ItemListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink-100 rounded-card bg-surface shadow-sm" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 p-4 sm:p-6">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-md bg-ink-100 sm:h-28 sm:w-28" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-ink-100" />
          </div>
          <div className="h-4 w-14 shrink-0 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

/** A generic rounded card of placeholder lines -- order summaries, address
 * panels, account info, the payment and confirmation cards. */
export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-card bg-surface p-6 shadow-sm" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 animate-pulse rounded bg-ink-100 ${i === 0 ? "w-1/2" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Shared empty state, so "nothing here" always offers a way out. */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-surface px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
