// server/src/routes/budget.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";

export const budgetRoutes = new Hono<AppBindings>();

// GET /api/companies/:companyId/budgets/overview
budgetRoutes.get("/companies/:companyId/budgets/overview", async (c) => {
  const services = c.get("services");
  const overview = await services.budget.getOverview(c.req.param("companyId"));
  return c.json(overview);
});

// GET /api/companies/:companyId/budget-incidents
budgetRoutes.get("/companies/:companyId/budget-incidents", async (c) => {
  const services = c.get("services");
  const incidents = await services.budget.listIncidents(c.req.param("companyId"));
  return c.json(incidents);
});

// POST /api/companies/:companyId/budget-incidents/:id/respond
budgetRoutes.post("/companies/:companyId/budget-incidents/:id/respond", async (c) => {
  const body = await c.req.json();
  const { response } = body as { response: "increase_budget" | "stop" | "ignore" };
  const services = c.get("services");
  await services.budget.respondToIncident(c.req.param("id"), response);
  return c.json({ message: "응답이 처리됐어요" });
});
