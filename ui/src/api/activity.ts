import { api } from "./client";

export interface ActivityItem {
  id: string;
  projectId: string;
  type:
    | "task_created"
    | "task_completed"
    | "agent_hired"
    | "agent_fired"
    | "goal_completed"
    | "approval_requested"
    | "error_occurred"
    | "cost_alert";
  title: string;
  description: string | null;
  actorId: string | null;
  actorName: string | null;
  actorType: "human" | "agent" | "system";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function listActivity(
  projectId: string,
  params?: { limit?: number; cursor?: string },
): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
  return api.get(`/projects/${projectId}/activity`, params);
}
