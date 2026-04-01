import { z } from "zod";

export const CreateInitiativeSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  goal_id: z.string().uuid(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export const UpdateInitiativeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});
