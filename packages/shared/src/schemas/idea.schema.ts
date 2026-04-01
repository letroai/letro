import { z } from "zod";

export const CreateIdeaSchema = z.object({
  raw_text: z
    .string()
    .min(1, "아이디어를 입력해주세요")
    .max(2000, "2000자 이내로 입력해주세요"),
});
export type CreateIdeaInput = z.infer<typeof CreateIdeaSchema>;

export const IdeaStructuredSchema = z.object({
  summary: z.string(),
  goal: z.object({
    title: z.string(),
    description: z.string(),
  }),
  initiatives: z.array(
    z.object({
      title: z.string(),
      tasks: z.array(z.string()),
    }),
  ),
  team_composition: z.object({
    leader: z.object({ display_name: z.string() }),
    members: z.array(
      z.object({
        preset: z.string(),
        member_type: z.string(),
        display_name: z.string(),
        reason: z.string(),
      }),
    ),
  }),
  tech_stack: z.record(z.string(), z.string()),
  estimated_duration_days: z.number().int().positive(),
  estimated_cost_usd: z.number().positive(),
  required_connections: z.array(z.string()),
});
export type IdeaStructured = z.infer<typeof IdeaStructuredSchema>;

export const ActivateIdeaSchema = z.object({
  confirmed: z.literal(true),
});
