import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Server-only database client.
 *
 * DATABASE_URL is never exposed to the browser: this module must only ever be
 * imported from Server Components, Server Actions and Route Handlers.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
  );
}

export const db = drizzle(neon(databaseUrl), { schema });
export { schema };
