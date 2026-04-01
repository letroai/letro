// server/src/routes/auth.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";

export const authRoutes = new Hono<AppBindings>();

// GET /api/auth/session — Returns the current session user
authRoutes.get("/auth/session", async (c) => {
  const config = c.get("config");

  if (config.authMode === "local_trusted") {
    // local_trusted mode: return default user without authentication
    return c.json({
      id: "local-user",
      email: "local@letro.ai",
      displayName: "나",
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    });
  }

  // authenticated mode (Phase 2)
  // TODO: Look up user from Better Auth session
  return c.json(null, 401);
});
