import { z } from "zod";

export const PeerReviewTypeSchema = z.enum([
  "code_review",
  "task_decomposition",
  "architecture",
  "deployment",
]);

export const PeerReviewVerdictSchema = z.enum([
  "pending",
  "approved",
  "needs_revision",
  "rejected",
]);

export const CreatePeerReviewSchema = z.object({
  issue_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  review_type: PeerReviewTypeSchema.default("code_review"),
});

export const UpdatePeerReviewSchema = z.object({
  verdict: PeerReviewVerdictSchema,
  score: z.number().int().min(0).max(100).optional(),
  feedback: z.string().max(5000).optional(),
  suggestions: z.array(z.string()).optional(),
});
