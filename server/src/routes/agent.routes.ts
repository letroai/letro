// server/src/routes/agent.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreateAgentSchema, UpdateAgentSchema } from "@letro/shared/schemas/agent.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const agentRoutes = new Hono<AppBindings>();

// GET /api/companies/:companyId/agents
agentRoutes.get("/companies/:companyId/agents", async (c) => {
  const services = c.get("services");
  const filters = stripUndefined({
    teamRole: c.req.query("team_role"),
    status: c.req.query("status"),
    projectId: c.req.query("project_id"),
  });
  const list = await services.agent.list(c.req.param("companyId"), filters);
  return c.json(list);
});

// GET /api/agents/:id
agentRoutes.get("/agents/:id", async (c) => {
  const services = c.get("services");
  const agent = await services.agent.getById(c.req.param("id"));
  if (!agent) return c.json({ message: "Agent not found" }, 404);
  return c.json(agent);
});

// POST /api/companies/:companyId/agents
agentRoutes.post("/companies/:companyId/agents", async (c) => {
  const body = await c.req.json();
  const parsed = CreateAgentSchema.parse(body);
  const services = c.get("services");
  const agent = await services.agent.create(c.req.param("companyId"), parsed);
  return c.json(agent, 201);
});

// PATCH /api/agents/:id
agentRoutes.patch("/agents/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateAgentSchema.parse(body);
  const services = c.get("services");
  const agent = await services.agent.update(c.req.param("id"), stripUndefined(parsed));
  return c.json(agent);
});

// DELETE /api/agents/:id
agentRoutes.delete("/agents/:id", async (c) => {
  const services = c.get("services");
  await services.agent.delete(c.req.param("id"));
  return c.body(null, 204);
});

// POST /api/agents/:id/keys
agentRoutes.post("/agents/:id/keys", async (c) => {
  const services = c.get("services");
  const body = await c.req.json().catch(() => ({}));
  const name = ((body as Record<string, unknown>).name as string) ?? "default";
  const key = await services.agent.createApiKey(c.req.param("id"), name);
  return c.json(key, 201);
});

// GET /api/agents/:id/keys
agentRoutes.get("/agents/:id/keys", async (c) => {
  const services = c.get("services");
  const keys = await services.agent.listApiKeys(c.req.param("id"));
  return c.json(keys);
});

// DELETE /api/agents/:id/keys/:keyId
agentRoutes.delete("/agents/:id/keys/:keyId", async (c) => {
  const services = c.get("services");
  await services.agent.deleteApiKey(c.req.param("keyId"));
  return c.body(null, 204);
});

// POST /api/agents/:id/hire — Implemented in Day 10~11
agentRoutes.post("/companies/:companyId/agents/hire", async (c) => {
  return c.json({ message: "To be implemented in Day 10~11" }, 501);
});

// POST /api/agents/:id/fire — Implemented in Day 10~11
agentRoutes.post("/agents/:id/fire", async (c) => {
  return c.json({ message: "To be implemented in Day 10~11" }, 501);
});
