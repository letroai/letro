// server/src/index.ts
import { serve } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import pino from "pino";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { initDatabase } from "./services/database.js";
import { createServiceContainer } from "./services/index.js";
import { setupWebSocketServer } from "./ws/websocket-server.js";

async function main() {
  const config = loadConfig();

  const logger = pino({
    level: config.logLevel,
    ...(config.logPretty && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    }),
  });

  logger.info({ mode: config.letroMode, auth: config.authMode }, "Starting Letro server...");

  // Ensure workspaces root directory exists
  const workspacesRoot = resolve(config.workspacesDir);
  mkdirSync(workspacesRoot, { recursive: true });
  logger.info({ workspacesDir: workspacesRoot }, "Workspaces directory ready");

  const { db, cleanup: dbCleanup } = await initDatabase(config, logger);
  logger.info("Database initialized");

  const services = createServiceContainer({ db, config, logger });

  const app = createApp({ config, db, logger, services });

  const server = serve(
    {
      fetch: app.fetch,
      port: config.port,
      hostname: config.host,
    },
    (info) => {
      logger.info(
        {
          host: info.address,
          port: info.port,
          url: `http://${info.address}:${info.port}`,
        },
        "Letro server is running",
      );
    },
  );

  // Connect WebSocket server to HTTP server
  setupWebSocketServer(server);
  logger.info("WebSocket server ready at /api/ws");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");

    server.close(() => {
      logger.info("HTTP server closed");
    });

    await dbCleanup();

    logger.info("Letro server stopped");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
