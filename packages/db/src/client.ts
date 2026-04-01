// packages/db/src/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDb>;

/**
 * Drizzle client creation factory.
 *
 * @param url - PostgreSQL connection URL.
 *              If empty, Embedded PostgreSQL must be started (handled server-side).
 * @returns Drizzle ORM instance (with full schema types)
 */
export function createDb(url: string) {
  const client = postgres(url, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  });

  const db = drizzle(client, { schema });

  return db;
}

/**
 * Raw client for executing SQL queries directly from a PostgreSQL connection URL.
 * Used for migrations, etc.
 */
export function createRawClient(url: string) {
  return postgres(url, { max: 1 });
}
