// server/src/routes/notification.routes.ts
import { Hono } from "hono";
import type { AppBindings, Actor } from "../env.js";

export const notificationRoutes = new Hono<AppBindings>();

function getCompanyId(actor: Actor): string | null {
  return "companyId" in actor ? (actor.companyId ?? null) : null;
}

// GET /api/notifications
notificationRoutes.get("/notifications", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json([]);
  const limit = Number(c.req.query("limit") || "50");
  const offset = Number(c.req.query("offset") || "0");
  const items = await c.get("services").notification.getInbox(companyId, { limit, offset });
  return c.json(items);
});

// GET /api/notifications/unread/count
notificationRoutes.get("/notifications/unread/count", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json({ count: 0 });
  const count = await c.get("services").notification.getUnreadCount(companyId);
  return c.json({ count });
});

// POST /api/notifications/mark-read
notificationRoutes.post("/notifications/mark-read", async (c) => {
  c.get("services").notification.markAllRead();
  return c.json({ success: true });
});

// GET /api/companies/:companyId/notifications — legacy route
notificationRoutes.get("/companies/:companyId/notifications", async (c) => {
  const companyId = c.req.param("companyId");
  const items = await c.get("services").notification.getInbox(companyId, { limit: 50 });
  return c.json(items);
});
