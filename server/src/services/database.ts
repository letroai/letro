// server/src/services/database.ts
import { createDb } from "@letro/db/client";
import { runMigrations } from "@letro/db";
import type { Config } from "../config.js";
import type { Logger } from "pino";
import type { Database } from "@letro/db/client";

export async function initDatabase(
  config: Config,
  logger: Logger,
): Promise<{
  db: Database;
  databaseUrl: string;
  cleanup: () => Promise<void>;
}> {
  let databaseUrl = config.databaseUrl ?? "";
  let cleanup = async () => {};

  if (!databaseUrl) {
    logger.info("Starting Embedded PostgreSQL...");
    const { default: EmbeddedPostgres } = await import("embedded-postgres");

    const port = 5433; // Avoid conflict with default PG port
    const user = "letro";
    const password = "letro";

    const pg = new EmbeddedPostgres({
      databaseDir: config.embeddedPgDir,
      port,
      user,
      password,
      persistent: true,
    });

    try {
      await pg.initialise();
    } catch {
      // Ignore if data directory already initialized (persistent mode restart)
    }
    await pg.start();
    try {
      await pg.createDatabase("letro");
    } catch {
      // Ignore if database already exists
    }

    databaseUrl = `postgresql://${user}:${password}@localhost:${port}/letro`;
    cleanup = async () => {
      logger.info("Stopping Embedded PostgreSQL...");
      await pg.stop();
    };
    logger.info({ url: databaseUrl }, "Embedded PostgreSQL started");
  } else {
    logger.info({ url: databaseUrl.replace(/\/\/.*@/, "//***@") }, "Using external PostgreSQL");
  }

  logger.info("Running migrations...");
  await runMigrations(databaseUrl);
  logger.info("Migrations completed");

  const db = createDb(databaseUrl);

  return { db, databaseUrl, cleanup };
}
