/** Small hand-written line icons -- no icon library dependency for two glyphs. */

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

export function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 4h2l1.2 11.6a1.5 1.5 0 0 0 1.5 1.4h9.1a1.5 1.5 0 0 0 1.5-1.3L19.5 8H6.1" />
      <circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
