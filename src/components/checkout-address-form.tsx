"use client";

import { useActionState } from "react";

import { saveCheckoutAddressAction, type AddressActionState } from "@/app/actions/checkout";

const fields = [
  ["name", "Full name", "text", "name"],
  ["line1", "Address line 1", "text", "address-line1"],
  ["line2", "Address line 2 (optional)", "text", "address-line2"],
  ["city", "City", "text", "address-level2"],
  ["postalCode", "Postal code", "text", "postal-code"],
  ["country", "Country code", "text", "country"],
] as const;

export function CheckoutAddressForm() {
  const [state, action, pending] = useActionState<AddressActionState, FormData>(saveCheckoutAddressAction, null);
  return (
    <form action={action} className="space-y-4 rounded-card bg-surface p-6 shadow-sm">
      {fields.map(([name, label, type, autoComplete]) => (
        <div key={name}>
          <label htmlFor={name} className="block text-sm font-medium text-ink-800">{label}</label>
          <input id={name} name={name} type={type} autoComplete={autoComplete} required={name !== "line2"} maxLength={name === "country" ? 2 : undefined} placeholder={name === "country" ? "US" : undefined} className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500" />
        </div>
      ))}
      {state?.error && <p role="alert" className="rounded-md bg-amber-accent/20 px-3 py-2 text-sm text-ink-900">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-ink-900 px-4 py-3 text-sm font-semibold text-ink-50 hover:bg-ink-800 disabled:opacity-60">{pending ? "Saving address…" : "Continue to payment"}</button>
    </form>
  );
}
