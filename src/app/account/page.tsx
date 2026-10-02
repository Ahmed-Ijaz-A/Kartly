import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { db, schema } from "@/db";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Your account — Kartly" };
export const dynamic = "force-dynamic";

/**
 * The first protected page -- the pattern every later one (orders, wishlist)
 * reuses. requireSession() redirects signed-out visitors before anything
 * else runs, and the user id it returns (from the verified session cookie)
 * is the ONLY id used below. There is no form field or query param anywhere
 * on this page that could supply a different one -- a request forged with
 * some other user's id has nothing to attach to.
 */
export default async function AccountPage() {
  const session = await requireSession("/login?next=/account");

  const [user] = await db
    .select({ name: schema.users.name, email: schema.users.email, createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  // The signed cookie verified, but the row it points to is gone (deleted
  // account, wiped dev database). Treat it as signed out rather than crash.
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Your account</h1>

      <dl className="mt-6 divide-y divide-ink-100 rounded-card bg-surface shadow-sm">
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="text-sm text-ink-700">Name</dt>
          <dd className="text-sm font-medium text-ink-900">{user.name}</dd>
        </div>
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="text-sm text-ink-700">Email</dt>
          <dd className="text-sm font-medium text-ink-900">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="text-sm text-ink-700">Member since</dt>
          <dd className="text-sm font-medium text-ink-900">
            {user.createdAt.toISOString().slice(0, 10)}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 divide-y divide-ink-100 rounded-card bg-surface text-sm shadow-sm">
        <li className="px-6 py-3">
          <Link href="/orders" className="font-medium text-ink-900 hover:underline">
            Order history
          </Link>
        </li>
        <li className="px-6 py-3">
          <Link href="/wishlist" className="font-medium text-ink-900 hover:underline">
            Wishlist
          </Link>
        </li>
      </ul>

      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="rounded-md border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-ink-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
