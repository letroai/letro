// server/src/routes/dashboard.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";

export const dashboardRoutes = new Hono<AppBindings>();

// GET /api/projects/:projectId/dashboard — Project-based dashboard (convenience route)
dashboardRoutes.get("/projects/:projectId/dashboard", async (c) => {
  const actor = c.get("actor");
  const companyId = "companyId" in actor ? actor.companyId : null;
  if (!companyId) return c.json({ message: "회사 정보를 찾을 수 없어요" }, 400);
  const services = c.get("services");
  const summary = await services.dashboard.getSummary(companyId);
  return c.json(summary);
});

// GET /api/companies/:companyId/dashboard
dashboardRoutes.get("/companies/:companyId/dashboard", async (c) => {
  const services = c.get("services");
  const summary = await services.dashboard.getSummary(c.req.param("companyId"));
  return c.json(summary);
});

// GET /api/companies/:companyId/sidebar-badges
dashboardRoutes.get("/companies/:companyId/sidebar-badges", async (c) => {
  const services = c.get("services");
  const badges = await services.dashboard.getSidebarBadges(c.req.param("companyId"));
  return c.json(badges);
});
