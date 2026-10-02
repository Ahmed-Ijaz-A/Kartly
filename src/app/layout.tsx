import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist } from "next/font/google";

import { logoutAction } from "@/app/actions/auth";
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
                <>
                  <Link href="/account" className="hover:text-amber-accent">
                    Hello, {session.name.split(" ")[0]}
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="text-ink-300 hover:text-amber-accent">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="hover:text-amber-accent">
                  Sign in
                </Link>
              )}
              <Link href="/cart" className="relative flex items-center gap-1 hover:text-amber-accent">
                Cart
                {cartCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-amber-accent px-1.5 py-0.5 text-xs font-bold leading-none text-ink-900">
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

        <footer className="mt-16 border-t border-ink-100 bg-surface">
          <div className="mx-auto max-w-[1600px] px-4 py-8 text-sm text-ink-700 sm:px-6 lg:px-10">
            Kartly — a 24-hour build. Catalogue content is real listing data
            from the Amazon Reviews 2023 dataset.
          </div>
        </footer>
      </body>
    </html>
  );
}
