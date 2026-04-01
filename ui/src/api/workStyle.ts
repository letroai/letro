import { api } from "./client";

/**
 * Work style controls how much the team asks for confirmation.
 * - "autonomous": Rarely asks, works on its own
 * - "balanced": Asks for important decisions only
 * - "cautious": Asks before most actions
 */
export type WorkStyleValue = "autonomous" | "balanced" | "cautious";

export interface WorkStyleConfig {
  projectId: string;
  workStyle: WorkStyleValue;
  updatedAt: string;
}

export function getWorkStyle(projectId: string): Promise<WorkStyleConfig> {
  return api.get<WorkStyleConfig>(`/projects/${projectId}/work-style`);
}

export function updateWorkStyle(
  projectId: string,
  workStyle: WorkStyleValue,
): Promise<WorkStyleConfig> {
  return api.patch<WorkStyleConfig>(`/projects/${projectId}/work-style`, {
    workStyle,
  });
}
