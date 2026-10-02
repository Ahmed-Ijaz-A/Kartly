"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createPaymentIntentAction } from "@/app/actions/checkout";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentForm({ clientSecret, orderId }: { clientSecret: string; orderId: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Check your payment details.");
      setPending(false);
      return;
    }
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: `${window.location.origin}/checkout/confirmation?order=${orderId}` },
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message ?? "Payment could not be completed.");
      setPending(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") router.push(`/checkout/confirmation?order=${orderId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement />
      {error && <p role="alert" className="rounded-md bg-amber-accent/20 px-3 py-2 text-sm text-ink-900">{error}</p>}
      <button type="submit" disabled={!stripe || pending} className="w-full rounded-md bg-ink-900 px-4 py-3 text-sm font-semibold text-ink-50 hover:bg-ink-800 disabled:opacity-60">{pending ? "Processing payment…" : "Pay securely"}</button>
    </form>
  );
}

export function StripePaymentForm({ orderId }: { orderId: number }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(publishableKey ? null : "Stripe is not configured for this environment.");

  useEffect(() => {
    if (!publishableKey) return;
    void createPaymentIntentAction(orderId).then((result) => {
      if ("error" in result) setError(result.error);
      else setClientSecret(result.clientSecret);
    });
  }, [orderId]);

  if (error) return <p role="alert" className="rounded-md bg-amber-accent/20 px-3 py-2 text-sm text-ink-900">{error}</p>;
  if (!clientSecret) return <p role="status" className="text-sm text-ink-700">Preparing secure payment…</p>;
  return <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}><PaymentForm clientSecret={clientSecret} orderId={orderId} /></Elements>;
}
