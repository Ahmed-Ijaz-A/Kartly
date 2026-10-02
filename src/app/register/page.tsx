import Link from "next/link";

import { registerAction } from "@/app/actions/auth";
import { AuthForm, FormField } from "@/components/auth-form";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Create account — Kartly" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in: nothing to do here.
  if (await getSession()) redirect("/account");

  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Create your account</h1>
      <p className="mt-1 text-sm text-ink-700">
        Already have one?{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-ink-900">
          Sign in
        </Link>
      </p>

      <div className="mt-6 rounded-card bg-surface p-6 shadow-sm">
        <AuthForm action={registerAction} submitLabel="Create account" pendingLabel="Creating…" next={next ?? "/account"}>
          <FormField id="name" name="name" label="Name" autoComplete="name" />
          <FormField id="email" name="email" label="Email" type="email" autoComplete="email" />
          <FormField id="password" name="password" label="Password" type="password" autoComplete="new-password" />
          <p className="text-xs text-ink-500">At least 8 characters.</p>
        </AuthForm>
      </div>
    </div>
  );
}
