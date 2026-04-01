import { z } from "zod";

export const IssueStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
]);

export const IssuePrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const IssueOriginKindSchema = z.enum([
  "manual",
  "auto_generated",
  "exploration",
  "decomposition",
]);

export const CreateIssueSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  priority: IssuePrioritySchema.default("medium"),
  project_id: z.string().uuid().optional(),
  goal_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
  assignee_agent_id: z.string().uuid().optional(),
  labels: z.array(z.string()).optional(),
  estimated_tokens: z.number().int().nonnegative().optional(),
});

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  assignee_agent_id: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

export const CheckoutIssueSchema = z.object({
  agent_id: z.string().uuid(),
});

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  agent_id: z.string().uuid().optional(),
  user_id: z.string().optional(),
});

export const IssueListFiltersSchema = z.object({
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  origin_kind: IssueOriginKindSchema.optional(),
  assignee_agent_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
