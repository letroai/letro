import { z } from "zod";

export const AutonomyLevelEnum = z.enum(["manual", "confirm", "notify", "auto"]);

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  default_autonomy_level: z.number().int().min(1).max(4).optional(),
  token_budget_monthly: z.number().int().nonnegative().optional(),
  auto_hire_enabled: z.boolean().optional(),
  auto_fire_enabled: z.boolean().optional(),
  exploration_enabled: z.boolean().optional(),
  peer_review_required: z.boolean().optional(),
});

export const UpdateAutonomyConfigSchema = z.object({
  default_level: AutonomyLevelEnum.optional(),
  goal_overrides: z.record(z.string(), AutonomyLevelEnum).optional(),
  budget_hard_cap: z.number().int().nonnegative().optional(),
  max_agents: z.number().int().min(1).max(100).optional(),
  max_tasks_per_initiative: z.number().int().min(1).max(100).optional(),
});
