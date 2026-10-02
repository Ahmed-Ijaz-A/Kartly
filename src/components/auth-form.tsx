"use client";

import { useActionState } from "react";

import type { AuthFormState } from "@/app/actions/auth";

/**
 * Shared shell for the register and login forms. A Client Component because
 * it needs useActionState to show a validation error inline without a full
 * page reload -- everything else in this app stays server-rendered.
 */
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  next,
  children,
}: {
  action: (prevState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  next: string;
  children: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {children}

      {state?.error && (
        <p role="alert" className="rounded-md bg-amber-accent/20 px-3 py-2 text-sm text-ink-900">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-ink-50 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required = true,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500"
      />
    </div>
  );
}
