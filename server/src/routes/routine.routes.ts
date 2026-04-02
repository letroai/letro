// server/src/routes/routine.routes.ts
import { Hono } from "hono";
import type { AppBindings, Actor } from "../env.js";

export const routineRoutes = new Hono<AppBindings>();

function getCompanyId(actor: Actor): string | null {
  return "companyId" in actor ? (actor.companyId ?? null) : null;
}

// GET /api/routines
routineRoutes.get("/routines", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json([]);
  const projectId = c.req.query("projectId") || undefined;
  const list = await c.get("services").routine.list(companyId, projectId);
  return c.json(list);
});

// GET /api/routines/:id
routineRoutes.get("/routines/:id", async (c) => {
  const routine = await c.get("services").routine.getById(c.req.param("id"));
  if (!routine) return c.json({ message: "루틴을 찾을 수 없어요" }, 404);
  return c.json(routine);
});

// POST /api/routines
routineRoutes.post("/routines", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json({ message: "회사 정보 필요" }, 400);
  const body = await c.req.json<{
    name: string;
    description?: string;
    projectId?: string;
    cronExpression?: string;
    taskTemplate?: Record<string, unknown>;
  }>();
  if (!body.name) return c.json({ message: "이름이 필요해요" }, 400);
  const routine = await c.get("services").routine.create(companyId, body);
  return c.json(routine, 201);
});

// PATCH /api/routines/:id
routineRoutes.patch("/routines/:id", async (c) => {
  const body = await c.req.json();
  const routine = await c.get("services").routine.update(c.req.param("id"), body);
  if (!routine) return c.json({ message: "루틴을 찾을 수 없어요" }, 404);
  return c.json(routine);
});

// DELETE /api/routines/:id
routineRoutes.delete("/routines/:id", async (c) => {
  await c.get("services").routine.delete(c.req.param("id"));
  return c.body(null, 204);
});

// GET /api/routines/:id/runs
routineRoutes.get("/routines/:id/runs", async (c) => {
  const runs = await c.get("services").routine.listRuns(c.req.param("id"));
  return c.json(runs);
});
