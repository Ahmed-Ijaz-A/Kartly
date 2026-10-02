"use client";

/**
 * Root error boundary.
 *
 * Every page here is force-dynamic and queries the database on every
 * request, so a misconfigured DATABASE_URL (or a transient Neon hiccup)
 * surfaces as a thrown error at request time, not at build time. Without this
 * file, Next has nothing to catch that with, and the host platform falls back
 * to its own generic "server error" page -- which is what was happening here.
 *
 * error.message is shown deliberately: it is diagnostic text we wrote
 * ourselves (e.g. "DATABASE_URL is not set..."), never a secret value. No
 * connection string or key is ever interpolated into an Error message
 * anywhere in this app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <section className="rounded-card border border-amber-accent bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink-900">
          Something went wrong loading this page
        </h1>
        <p className="mt-2 text-sm text-ink-700">
          This is usually a missing or misconfigured{" "}
          <code>DATABASE_URL</code>. On Vercel: Settings → Environment
          Variables → confirm it is set for the <strong>Production</strong>{" "}
          environment, then redeploy.
        </p>
        <p className="mt-4 rounded bg-surface-muted p-3 font-mono text-xs text-ink-800">
          {error.message}
          {error.digest && (
            <>
              <br />
              digest: {error.digest}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-50 transition hover:bg-ink-800"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
