// server/src/routes/oauth.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";

export const oauthRoutes = new Hono<AppBindings>();

// GET /api/connect/:provider/auth — Start OAuth authentication
oauthRoutes.get("/connect/:provider/auth", async (c) => {
  // TODO: OAuth service integration (Phase 2)
  return c.json({ message: "OAuth integration to be implemented in Phase 2" }, 501);
});

// GET /api/connect/:provider/callback — OAuth callback
oauthRoutes.get("/connect/:provider/callback", async (c) => {
  // TODO: Handle OAuth callback (Phase 2)
  return c.json({ message: "OAuth callback to be implemented in Phase 2" }, 501);
});

// GET /api/connections — List connections
oauthRoutes.get("/connections", async (c) => {
  // TODO: Fetch connection list (Phase 2)
  return c.json([]);
});

// DELETE /api/connections/:id — Disconnect
oauthRoutes.delete("/connections/:id", async (c) => {
  // TODO: Disconnect (Phase 2)
  return c.body(null, 204);
});
