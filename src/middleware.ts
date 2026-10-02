/**
 * Kartly route-protection middleware.
 *
 * Runs at the edge (before the page component renders) for all paths listed
 * in the `config.matcher` below. Checks only for the presence of the session
 * cookie -- it cannot verify the HMAC signature here because node:crypto is
 * not available in the Edge runtime.
 *
 * This is a UX fast-path, not a security boundary. The real security boundary
 * is requireSession() inside each protected Server Component, which fully
 * verifies the signature and expiry before any data is read or written. A
 * forged or expired cookie will pass through middleware and then be rejected
 * by requireSession(), which redirects just the same.
 *
 * Why two layers?
 *   - Middleware avoids rendering the whole page tree for clearly signed-out
 *     users (no session cookie at all). Faster redirect, less work.
 *   - requireSession() handles the case where the cookie exists but is
 *     invalid/expired, and is the authority for every mutation downstream.
 *
 * Protected paths (add new ones here as steps 21–23 land):
 *   /account, /account/*
 *   /orders,  /orders/*
 *   /wishlist
 *   /checkout, /checkout/*
 */

import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kartly_session";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
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
  ],
};
