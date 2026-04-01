// packages/db/src/migrate.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// drizzle/ folder is located at packages/db/drizzle/
const DEFAULT_MIGRATIONS_DIR = resolve(__dirname, "../drizzle");

export async function runMigrations(
  url: string,
  migrationsFolder = DEFAULT_MIGRATIONS_DIR,
): Promise<void> {
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("[migrate] Running migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] Migrations completed.");

  await client.end();
}
