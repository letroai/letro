import { z } from "zod";

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  parent_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  auto_decompose: z.boolean().default(true),
  completion_criteria: z
    .object({
      type: z.enum(["all_subtasks_done", "metric"]),
      target: z.number().optional(),
    })
    .optional(),
});

export const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
});
