// server/src/routes/goal.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreateGoalSchema, UpdateGoalSchema } from "@letro/shared/schemas/goal.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const goalRoutes = new Hono<AppBindings>();

// GET /api/companies/:companyId/goals
goalRoutes.get("/companies/:companyId/goals", async (c) => {
  const services = c.get("services");
  const list = await services.goal.list(c.req.param("companyId"));
  return c.json(list);
});

// GET /api/goals/:id
goalRoutes.get("/goals/:id", async (c) => {
  const services = c.get("services");
  const goal = await services.goal.getById(c.req.param("id"));
  if (!goal) return c.json({ message: "Goal not found" }, 404);
  return c.json(goal);
});

// POST /api/companies/:companyId/goals
goalRoutes.post("/companies/:companyId/goals", async (c) => {
  const body = await c.req.json();
  const parsed = CreateGoalSchema.parse(body);
  const services = c.get("services");
  const goal = await services.goal.create(c.req.param("companyId"), stripUndefined(parsed));
  return c.json(goal, 201);
});

// PATCH /api/goals/:id
goalRoutes.patch("/goals/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateGoalSchema.parse(body);
  const services = c.get("services");
  const goal = await services.goal.update(c.req.param("id"), stripUndefined(parsed));
  return c.json(goal);
});

// DELETE /api/goals/:id
goalRoutes.delete("/goals/:id", async (c) => {
  const services = c.get("services");
  await services.goal.delete(c.req.param("id"));
  return c.body(null, 204);
});

// GET /api/goals/:id/progress
goalRoutes.get("/goals/:id/progress", async (c) => {
  const services = c.get("services");
  const progress = await services.goal.getProgress(c.req.param("id"));
  return c.json(progress);
});
