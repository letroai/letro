// server/src/routes/secret.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { getCompanyId } from "../lib/route-helpers.js";

export const secretRoutes = new Hono<AppBindings>();

// GET /api/secrets
secretRoutes.get("/secrets", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json([], 200);
  const secrets = await c.get("services").secret.list(companyId);
  return c.json(secrets);
});

// GET /api/secrets/resolve — Resolves secrets to env var names (for debugging)
secretRoutes.get("/secrets/resolve", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json([]);
  const env = await c.get("services").secret.resolveEnvBindings(companyId);
  return c.json(Object.keys(env).map((k) => ({ envVar: k, hasValue: true })));
});

// GET /api/secrets/:id
secretRoutes.get("/secrets/:id", async (c) => {
  const secret = await c.get("services").secret.getById(c.req.param("id"));
  if (!secret) return c.json({ message: "시크릿을 찾을 수 없어요" }, 404);
  return c.json(secret);
});

// POST /api/secrets
secretRoutes.post("/secrets", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json({ message: "회사 정보 필요" }, 400);
  const body = await c.req.json<{ key: string; value: string; description?: string; envVar?: string }>();
  if (!body.key || !body.value) return c.json({ message: "key와 value가 필요해요" }, 400);
  const secret = await c.get("services").secret.create(companyId, body);
  return c.json(secret, 201);
});

// PATCH /api/secrets/:id/rotate
secretRoutes.patch("/secrets/:id/rotate", async (c) => {
  const body = await c.req.json<{ value: string }>();
  if (!body.value) return c.json({ message: "새 값이 필요해요" }, 400);
  const result = await c.get("services").secret.rotate(c.req.param("id"), body.value);
  return c.json(result);
});

// DELETE /api/secrets/:id
secretRoutes.delete("/secrets/:id", async (c) => {
  await c.get("services").secret.delete(c.req.param("id"));
  return c.body(null, 204);
});

