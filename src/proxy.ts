/**
 * Kartly proxy (Next.js 16 renamed "Middleware" to "Proxy"; one file per
 * project, runs before the page component renders for every path listed in
 * `config.matcher`).
 *
 * Two independent jobs, each scoped to its own paths:
 *
 * 1. Route protection for signed-in-only pages. Checks only for the
 *    *presence* of the session cookie, not its signature -- Proxy now
 *    defaults to the Node.js runtime in Next 16 (node:crypto is available),
 *    so that's no longer a hard constraint, but it's still the right split:
 *    this is a UX fast-path, not the security boundary. The real security
 *    boundary is requireSession() inside each protected Server Component,
 *    which fully verifies the signature and expiry before any data is read
 *    or written. A forged or expired cookie passes through here and is then
 *    rejected by requireSession(), which redirects just the same.
 *
 *    Why two layers?
 *      - Proxy avoids rendering the whole page tree for clearly signed-out
 *        visitors (no session cookie at all). Faster redirect, less work.
 *      - requireSession() handles the cookie-exists-but-invalid/expired
 *        case, and is the authority for every mutation downstream.
 *
 * 2. A real 404 status for bad product slugs. /product/[slug] has a
 *    loading.tsx, which makes Next wrap the whole page in a Suspense
 *    boundary and start streaming a 200 response immediately -- by the time
 *    the page's own notFound() call runs, the status is already committed
 *    and can't change (this is documented Next.js behavior, not a bug: see
 *    the "Status Codes" section of the loading.js file-convention docs).
 *    The sanctioned fix is to check existence here, before streaming starts,
 *    and rewrite misses to a path with no route -- which lets Next's normal
 *    unmatched-route handling render our existing not-found.tsx with a
 *    genuine 404, no separate not-found page to maintain.
 */

import { neon } from "@neondatabase/serverless";
import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kartly_session";
const PRODUCT_SLUG = /^\/product\/([^/]+)\/?$/;

/**
 * Existence-only, no other columns -- "keep proxy checks fast, and avoid
 * fetching full content there" per Next's own guidance. Fails open: a
 * transient DB hiccup here must never block a real product page, so on any
 * error this says "exists" and lets the page's own getProductBySlug() +
 * notFound() handle it exactly as before this file existed.
 */
async function productSlugExists(slug: string): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return true;
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`SELECT 1 FROM products WHERE slug = ${slug} LIMIT 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const slugMatch = pathname.match(PRODUCT_SLUG);
  if (slugMatch) {
    const exists = await productSlugExists(decodeURIComponent(slugMatch[1]));
    if (!exists) {
      // No route matches this path, so Next falls through to its normal
      // unmatched-route handling: root not-found.tsx, real 404 status. The
      // browser's address bar still shows the original /product/<slug> URL.
      return NextResponse.rewrite(new URL("/__not-found__", request.url));
    }
    return NextResponse.next();
  }

  const hasCookie = request.cookies.has(COOKIE_NAME);
  if (!hasCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/orders/:path*",
    "/wishlist",
    "/checkout/:path*",
    "/product/:path*",
  ],
};
