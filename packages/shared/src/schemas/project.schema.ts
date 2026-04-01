import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  goal_ids: z.array(z.string().uuid()).optional(),
  auto_task_generation: z.boolean().default(true),
  autonomy_level_override: z.number().int().min(1).max(4).optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  auto_task_generation: z.boolean().optional(),
  autonomy_level_override: z.number().int().min(1).max(4).nullable().optional(),
});
