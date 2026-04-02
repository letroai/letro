// server/src/routes/project.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreateProjectSchema, UpdateProjectSchema } from "@letro/shared/schemas/project.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const projectRoutes = new Hono<AppBindings>();

// GET /api/projects — Current user's project list (convenience route)
projectRoutes.get("/projects", async (c) => {
  const actor = c.get("actor");
  const companyId = "companyId" in actor ? actor.companyId : null;
  if (!companyId) return c.json([]);
  const services = c.get("services");
  const list = await services.project.list(companyId);
  return c.json(list);
});

// GET /api/companies/:companyId/projects
projectRoutes.get("/companies/:companyId/projects", async (c) => {
  const services = c.get("services");
  const list = await services.project.list(c.req.param("companyId"));
  return c.json(list);
});

// GET /api/projects/:id
projectRoutes.get("/projects/:id", async (c) => {
  const services = c.get("services");
  const project = await services.project.getById(c.req.param("id"));
  if (!project) return c.json({ message: "Project not found" }, 404);
  return c.json(project);
});

// POST /api/companies/:companyId/projects
projectRoutes.post("/companies/:companyId/projects", async (c) => {
  const body = await c.req.json();
  const parsed = CreateProjectSchema.parse(body);
  const services = c.get("services");
  const result = await services.project.create(c.req.param("companyId"), stripUndefined(parsed));
  return c.json(result, 201);
});

// PATCH /api/projects/:id
projectRoutes.patch("/projects/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateProjectSchema.parse(body);
  const services = c.get("services");
  const project = await services.project.update(c.req.param("id"), stripUndefined(parsed));
  return c.json(project);
});

// DELETE /api/projects/:id
projectRoutes.delete("/projects/:id", async (c) => {
  const services = c.get("services");
  await services.project.delete(c.req.param("id"));
  return c.body(null, 204);
});

// GET /api/projects/:id/team
projectRoutes.get("/projects/:id/team", async (c) => {
  const services = c.get("services");
  const team = await services.project.getTeam(c.req.param("id"));
  return c.json(team);
});
