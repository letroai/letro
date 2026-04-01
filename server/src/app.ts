// server/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./env.js";
import type { Config } from "./config.js";
import type { Database } from "@letro/db/client";
import type { Logger } from "pino";
import type { ServiceContainer } from "./services/index.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { actorMiddleware } from "./middleware/actor.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerRoutes } from "./routes/index.js";

export interface AppDependencies {
  config: Config;
  db: Database;
  logger: Logger;
  services: ServiceContainer;
}

export function createApp(deps: AppDependencies) {
  const app = new Hono<AppBindings>();

  // 1. Global error handler
  app.onError(errorHandler);

  // 2. CORS
  app.use(
    "*",
    cors({
      origin: deps.config.nodeEnv === "development" ? "*" : [],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-Agent-Key"],
      maxAge: 86400,
    }),
  );

  // 3. Dependency injection
  app.use("*", async (c, next) => {
    c.set("requestStartTime", Date.now());
    c.set("db", deps.db);
    c.set("config", deps.config);
    c.set("logger", deps.logger);
    c.set("services", deps.services);
    await next();
  });

  // 4. Logger middleware
  app.use("*", loggerMiddleware());

  // 5. Actor middleware
  app.use("/api/*", actorMiddleware());

  // 6. Register routes
  registerRoutes(app);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
