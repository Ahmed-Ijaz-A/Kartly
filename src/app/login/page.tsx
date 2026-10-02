import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions/auth";
import { AuthForm, FormField } from "@/components/auth-form";
import { getSession } from "@/lib/session";

export const metadata = { title: "Sign in — Kartly" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSession()) redirect("/account");

  const { next } = await searchParams;
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h1>
      <p className="mt-1 text-sm text-ink-700">
        New to Kartly?{" "}
        <Link href={registerHref} className="underline underline-offset-4 hover:text-ink-900">
          Create an account
        </Link>
      </p>

      <div className="mt-6 rounded-card bg-surface p-6 shadow-sm">
        <AuthForm action={loginAction} submitLabel="Sign in" pendingLabel="Signing in…" next={next ?? "/account"}>
          <FormField id="email" name="email" label="Email" type="email" autoComplete="email" />
          <FormField id="password" name="password" label="Password" type="password" autoComplete="current-password" />
        </AuthForm>
      </div>
    </div>
  );
}
