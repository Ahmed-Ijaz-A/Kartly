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
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, property, receiver);
    // Methods must stay bound to the real client, not to the proxy.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
