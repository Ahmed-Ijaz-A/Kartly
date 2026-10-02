/**
 * Money handling for Kartly.
 *
 * Every amount in this app is an integer number of cents, from the database
 * through to the Stripe call. This module is the ONLY place cents become a
 * human-readable string, and that conversion happens at render time only.
 *
 * Never introduce a float amount. Never parse a formatted string back into a
 * number.
 */

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Render an integer cent amount for display, e.g. 10999 -> "$109.99". */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Percentage off, rounded to a whole number, for a discount badge. */
export function discountPercent(priceCents: number, listPriceCents: number): number {
  if (listPriceCents <= 0 || priceCents >= listPriceCents) return 0;
  return Math.round(((listPriceCents - priceCents) / listPriceCents) * 100);
}
