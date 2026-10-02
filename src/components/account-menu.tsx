"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PersonIcon } from "@/components/icons";

/**
 * Account icon with a dropdown -- replaces the old separate "Hello, name" /
 * Orders / Wishlist links in the header with one menu. A Client Component
 * because it owns open/close state; the sign-out Server Action is passed in
 * as a prop and rendered in a plain form, same as everywhere else signs out.
 */
export function AccountMenu({
  name,
  logoutAction,
}: {
  name: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-1 py-1 transition hover:text-amber-accent"
      >
        <PersonIcon className="h-6 w-6" />
        <span className="hidden sm:inline">{name.split(" ")[0]}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-md bg-surface py-1 text-ink-900 shadow-lg ring-1 ring-ink-100"
        >
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:bg-surface-muted"
          >
            Account info
          </Link>
          <Link
            href="/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:bg-surface-muted"
          >
            Order history
          </Link>
          <Link
            href="/wishlist"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:bg-surface-muted"
          >
            Wishlist
          </Link>
          <form action={logoutAction} className="border-t border-ink-100">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
