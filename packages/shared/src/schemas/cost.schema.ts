import { z } from "zod";

export const CreateCostEventSchema = z.object({
  agent_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  model: z.string().optional(),
  cost_cents: z.number().int().nonnegative().optional(),
  category: z.enum(["task", "exploration", "management", "peer_review"]).default("task"),
});

export const CostSummaryFiltersSchema = z.object({
  period: z.enum(["day", "week", "month", "all"]).default("month"),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});
