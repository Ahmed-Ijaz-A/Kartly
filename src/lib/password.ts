import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing, using Node's built-in scrypt -- no dependency needed.
 * scrypt is memory-hard and tunable, and is an OWASP-listed acceptable
 * choice for password storage (alongside bcrypt and argon2).
 *
 * Stored format: "<salt-hex>:<hash-hex>". A plaintext password is never
 * stored, logged, or returned from a query that feeds a response -- only
 * this hash is.
 */

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Timing-safe: never short-circuits on the first differing byte. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
