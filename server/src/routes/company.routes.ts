// server/src/routes/company.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreateCompanySchema, UpdateCompanySchema } from "@letro/shared/schemas/company.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const companyRoutes = new Hono<AppBindings>();

// GET /api/companies
companyRoutes.get("/companies", async (c) => {
  const services = c.get("services");
  const list = await services.company.list();
  return c.json(list);
});

// GET /api/companies/:id
companyRoutes.get("/companies/:id", async (c) => {
  const services = c.get("services");
  const company = await services.company.getById(c.req.param("id"));
  if (!company) return c.json({ message: "회사를 찾을 수 없어요" }, 404);
  return c.json(company);
});

// POST /api/companies
companyRoutes.post("/companies", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCompanySchema.parse(body);
  const actor = c.get("actor");
  const userId = actor.kind === "user" ? actor.userId : "system";
  const services = c.get("services");
  const company = await services.company.create(parsed, userId);
  return c.json(company, 201);
});

// PATCH /api/companies/:id
companyRoutes.patch("/companies/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateCompanySchema.parse(body);
  const services = c.get("services");
  const company = await services.company.update(c.req.param("id"), stripUndefined(parsed));
  return c.json(company);
});

// DELETE /api/companies/:id
companyRoutes.delete("/companies/:id", async (c) => {
  const services = c.get("services");
  await services.company.delete(c.req.param("id"));
  return c.body(null, 204);
});
