import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
        <header className="bg-ink-900 text-ink-50">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Kart<span className="text-amber-accent">ly</span>
            </Link>
            {/* Search, cart and account arrive in roadmap steps 7, 14 and 12. */}
            <nav className="ml-auto flex items-center gap-5 text-sm">
              <span className="text-ink-300">Search — step 7</span>
              <span className="text-ink-300">Account — step 12</span>
              <span className="text-ink-300">Cart — step 14</span>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-ink-100 bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-ink-700">
            Kartly — a 24-hour build. Product imagery is placeholder photography
            from Lorem Picsum.
          </div>
        </footer>
      </body>
    </html>
  );
}
