"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db, schema } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { mergeAnonymousCart } from "@/lib/cart";

export type AuthFormState = { error: string } | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Only redirect to a path we control -- "/account", never to another origin.
 * Guards against an open-redirect via a crafted `next` value ("//evil.com",
 * "https://evil.com", ...).
 */
function safeNextPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || name.length > 120) {
    return { error: "Enter your name." };
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8 || password.length > 200) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return { error: "An account with this email already exists." };
  }

  const [user] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: hashPassword(password) })
    .returning({ id: schema.users.id, name: schema.users.name });

  await mergeAnonymousCart(user.id);
  await createSession({ userId: user.id, name: user.name });
  redirect(safeNextPath(formData.get("next")));
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  // Identical message whether the email doesn't exist or the password is
  // wrong -- never tell a caller which half of the pair was incorrect.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  await mergeAnonymousCart(user.id);
  await createSession({ userId: user.id, name: user.name });
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
