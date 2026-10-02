import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Session handling for Kartly.
 *
 * A session is a single signed, httpOnly cookie -- no sessions table. The
 * cookie carries { userId, name, exp } as base64url JSON, with an HMAC-SHA256
 * signature (keyed by SESSION_SECRET) appended. Reading it verifies the
 * signature with a timing-safe comparison and checks expiry server-side,
 * independent of the cookie's own Max-Age.
 *
 * `name` rides along so the header can greet a signed-in user without a
 * database round trip on every single page load. It goes stale if the user
 * later changes their name (not a feature yet) until they next log in --
 * an accepted trade-off, same as any cached claim in a JWT.
 *
 * getSession() is the ONLY function anywhere in this app that may produce a
 * user id to act on. Every later mutation (cart, wishlist, reviews, orders)
 * must read the acting user from here -- never from a client-supplied id in
 * a request body, query param or hidden form field. A forged id in a
 * request changes nothing, because nothing ever looks at it.
 */

const COOKIE_NAME = "kartly_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Session = { userId: number; name: string };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error(
      "SESSION_SECRET is not set. Locally: add it to .env.local. On Vercel: Settings > Environment Variables.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function encode(user: Session): string {
  const json = JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const body = Buffer.from(json, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): Session | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as Record<string, unknown>).userId !== "number" ||
    typeof (payload as Record<string, unknown>).name !== "string" ||
    typeof (payload as Record<string, unknown>).exp !== "number"
  ) {
    return null;
  }

  const { userId, name, exp } = payload as { userId: number; name: string; exp: number };
  if (Date.now() > exp) return null;

  return { userId, name };
}

/** Sets the session cookie. Server Actions and Route Handlers only -- Server
 * Components cannot set cookies. */
export async function createSession(user: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The current session, or null if signed out or the cookie doesn't verify. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? decode(token) : null;
}

/**
 * Like getSession, but redirects to sign-in when signed out. Use at the top
 * of any protected Server Component page.
 */
export async function requireSession(redirectTo = "/login"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}
