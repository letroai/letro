// server/src/routes/health.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { sql } from "drizzle-orm";

export const healthRoutes = new Hono<AppBindings>();

healthRoutes.get("/health", async (c) => {
  const db = c.get("db");
  const config = c.get("config");

  let dbStatus: "ok" | "error" = "error";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch {
    dbStatus = "error";
  }

  const overallStatus = dbStatus === "ok" ? "ok" : "degraded";
  const statusCode = overallStatus === "ok" ? 200 : 503;

  return c.json(
    {
      status: overallStatus,
      version: "0.1.0",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        auth_mode: config.authMode,
        letro_mode: config.letroMode,
      },
    },
    statusCode,
  );
});
