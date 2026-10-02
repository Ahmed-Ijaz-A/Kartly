import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Server-only database client.
 *
 * DATABASE_URL is never exposed to the browser: this module must only ever be
 * imported from Server Components, Server Actions and Route Handlers.
 *
 * The connection is created lazily, on first query, NOT at import time.
 * That matters during `next build`: collecting page data imports every page
 * module, so an import-time connection would make the build itself require a
 * database. It does not -- every page here is force-dynamic and only runs at
 * request time. Building without DATABASE_URL must succeed.
 */
type Database = NeonHttpDatabase<typeof schema>;

let cached: Database | null = null;

function getDb(): Database {
  if (cached) return cached;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Locally: copy .env.example to .env.local and add your Neon connection string. On Vercel: add it under Settings > Environment Variables.",
    );
  }

  cached = drizzle(neon(databaseUrl), { schema });
  return cached;
}

/**
 * Proxy so call sites keep the plain `db.select(...)` shape while the real
 * client is only built on first property access.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const instance = getDb();
    // Deliberately NOT forwarding the proxy as the receiver: a getter on the
    // real class (e.g. drizzle's db.query.*) would then run with `this` bound
    // to this proxy instead of the real instance, and throw on any private
    // class field it touches. `instance` as receiver keeps `this` real for
    // getters, same as the explicit .bind below does for methods.
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
