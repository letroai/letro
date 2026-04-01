// server/src/routes/cost.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreateCostEventSchema, CostSummaryFiltersSchema } from "@letro/shared/schemas/cost.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const costRoutes = new Hono<AppBindings>();

// POST /api/companies/:companyId/cost-events
costRoutes.post("/companies/:companyId/cost-events", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCostEventSchema.parse(body);
  const services = c.get("services");
  const event = await services.cost.createEvent(c.req.param("companyId"), {
    agentId: parsed.agent_id,
    inputTokens: parsed.input_tokens,
    outputTokens: parsed.output_tokens,
    ...(parsed.run_id != null ? { heartbeatRunId: parsed.run_id } : {}),
    ...(parsed.model != null ? { model: parsed.model } : {}),
    ...(parsed.cost_cents != null ? { costCents: parsed.cost_cents } : {}),
    ...(parsed.category != null ? { kind: parsed.category } : {}),
  });
  return c.json(event, 201);
});

// GET /api/companies/:companyId/costs/summary
costRoutes.get("/companies/:companyId/costs/summary", async (c) => {
  const filters = CostSummaryFiltersSchema.parse(c.req.query());
  const services = c.get("services");
  const summary = await services.cost.getSummary(c.req.param("companyId"), {
    period: filters.period,
    ...(filters.start_date != null ? { startDate: filters.start_date } : {}),
    ...(filters.end_date != null ? { endDate: filters.end_date } : {}),
  });
  return c.json(summary);
});

// GET /api/companies/:companyId/costs/by-agent
costRoutes.get("/companies/:companyId/costs/by-agent", async (c) => {
  const services = c.get("services");
  const result = await services.cost.getByAgent(c.req.param("companyId"), c.req.query("period") ?? undefined);
  return c.json(result);
});

// GET /api/companies/:companyId/costs/window-spend
costRoutes.get("/companies/:companyId/costs/window-spend", async (c) => {
  const services = c.get("services");
  const spend = await services.cost.getWindowSpend(c.req.param("companyId"));
  return c.json({ spend_cents: spend });
});
