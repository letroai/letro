import { z } from "zod";

export const ActivityEventTypeSchema = z.enum([
  // Basic events
  "issue_created",
  "issue_updated",
  "issue_status_changed",
  "issue_assigned",
  "issue_checkout",
  "issue_release",
  "issue_completed",
  "comment_added",
  "heartbeat_run_started",
  "heartbeat_run_completed",
  "heartbeat_run_failed",
  "agent_created",
  "agent_updated",
  "agent_terminated",
  "project_created",
  "goal_created",
  "goal_completed",

  // Autonomous action events (Letro-specific)
  "agent_hired_by_leader",
  "agent_fired_by_leader",
  "task_auto_generated",
  "task_auto_assigned",
  "goal_auto_decomposed",
  "initiative_created",
  "peer_review_requested",
  "peer_review_completed",
  "exploration_started",
  "exploration_completed",
  "budget_soft_cap_reached",
  "budget_hard_cap_reached",
  "budget_auto_increased",
  "autonomy_level_changed",
  "idea_submitted",
  "idea_structured",
  "idea_activated",
]);
export type ActivityEventType = z.infer<typeof ActivityEventTypeSchema>;
