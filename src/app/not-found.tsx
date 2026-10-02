import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-card bg-surface px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-amber-accent-dark">
        404
      </p>
      <h1 className="mt-3 text-2xl font-bold text-ink-900">
        We could not find that page
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-700">
        The product may have sold out and been removed, or the link may be
        mistyped. The catalogue is still here.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/search"
          className="rounded-md bg-ink-900 px-5 py-2.5 text-sm font-semibold text-ink-50 transition hover:bg-ink-800"
        >
          Browse everything
        </Link>
        <Link
          href="/"
          className="rounded-md border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:bg-ink-100"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
