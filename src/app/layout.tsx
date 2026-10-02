import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist } from "next/font/google";

import { logoutAction } from "@/app/actions/auth";
import { AccountMenu } from "@/components/account-menu";
import { CartIcon, PersonIcon } from "@/components/icons";
import { SearchBox } from "@/components/search-box";
import { getCartCount } from "@/lib/cart";
import { getSession } from "@/lib/session";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kartly — everyday things, chosen well",
  description:
    "Kartly is a general merchandise store: electronics, home, outdoors, books and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read once per request, here, from the verified session cookie only --
  // this is purely for the header greeting, not an auth decision. Each
  // protected page still calls requireSession() itself.
  const [session, cartCount] = await Promise.all([getSession(), getCartCount()]);

  return (
    <html lang="en">
      {/*
        suppressHydrationWarning is scoped to <body>'s own attributes, not its
        children. Browser extensions (password managers, colour pickers, and
        similar) inject attributes such as cz-shortcut-listen onto <body>
        between the server HTML arriving and React hydrating, which React
        otherwise reports as a mismatch. This silences that false positive
        only -- a real hydration bug inside the tree is still reported.
      */}
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} min-h-screen font-sans antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-amber-accent focus:px-4 focus:py-2 focus:text-ink-900"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 bg-ink-900 text-ink-50">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight"
              aria-label="Kartly home"
            >
              Kart<span className="text-amber-accent">ly</span>
            </Link>

            {/* useSearchParams needs a Suspense boundary in the App Router. */}
            <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
              <Suspense fallback={<div className="h-10 rounded-md bg-ink-800" />}>
                <SearchBox />
              </Suspense>
            </div>

            <nav className="order-2 ml-auto flex items-center gap-4 text-sm sm:order-3">
              {session ? (
                <AccountMenu name={session.name} logoutAction={logoutAction} />
              ) : (
                <Link href="/login" className="flex items-center gap-1.5 hover:text-amber-accent">
                  <PersonIcon className="h-6 w-6" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              )}
              <Link
                href="/cart"
                aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
                className="relative flex items-center hover:text-amber-accent"
              >
                <CartIcon className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-[1.1rem] rounded-full bg-amber-accent px-1 py-0.5 text-center text-[10px] font-bold leading-none text-ink-900">
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>

        <footer className="mt-16 bg-ink-900 text-ink-50">
          <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr]">
              <div>
                <Link href="/" className="text-4xl font-bold tracking-tight" aria-label="Kartly home">
                  Kart<span className="text-amber-accent">ly</span>
                </Link>
                <p className="mt-3 max-w-xs text-sm text-ink-300">
                  Everyday things, chosen well. A general merchandise store built
                  for speed and clarity, not endless aisles.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-300">
                  Shop
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link href="/search" className="hover:text-amber-accent">All products</Link></li>
                  <li><Link href="/search?sort=price-asc" className="hover:text-amber-accent">Best value</Link></li>
                  <li><Link href="/search?sort=rating" className="hover:text-amber-accent">Top rated</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-300">
                  Your account
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link href="/account" className="hover:text-amber-accent">Account</Link></li>
                  <li><Link href="/orders" className="hover:text-amber-accent">Orders</Link></li>
                  <li><Link href="/wishlist" className="hover:text-amber-accent">Wishlist</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-300">
                  About this build
                </h3>
                <p className="mt-3 text-sm text-ink-300">
                  A 24-hour build. Catalogue content is real listing data from
                  the Amazon Reviews 2023 dataset.
                </p>
              </div>
            </div>

            <div className="mt-10 border-t border-ink-800 pt-6 text-xs text-ink-300">
              © {new Date().getFullYear()} Kartly. Built as a demo project.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
