import { z } from "zod";

export const TeamRoleSchema = z.enum(["leader", "member"]);
export const MemberTypeSchema = z.enum([
  "coder",
  "researcher",
  "reviewer",
  "specialist",
  "qa",
]);

export const AgentStatusSchema = z.enum([
  "idle",
  "working",
  "paused",
  "terminated",
]);

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(200),
  team_role: TeamRoleSchema.default("member"),
  member_type: MemberTypeSchema.optional(),
  preset_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  adapter_type: z.string().default("claude_local"),
  specialization: z.array(z.string()).default([]),
  instructions: z.string().max(10000).optional(),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: AgentStatusSchema.optional(),
  instructions: z.string().max(10000).optional(),
  specialization: z.array(z.string()).optional(),
  max_concurrent_tasks: z.number().int().min(1).max(10).optional(),
});

export const HireAgentSchema = z.object({
  preset: z.string(),
  reason: z.string().min(1).max(500),
  project_id: z.string().uuid(),
  specialization: z.array(z.string()).optional(),
});

export const FireAgentSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100).default("default"),
});
