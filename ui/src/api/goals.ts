import { api } from "./client";

export interface Goal {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "abandoned";
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goalId: string;
  progress: number;
  milestones: {
    id: string;
    title: string;
    completed: boolean;
    completedAt: string | null;
  }[];
}

export function listGoals(projectId: string): Promise<Goal[]> {
  return api.get<Goal[]>(`/projects/${projectId}/goals`);
}

export function getGoal(projectId: string, goalId: string): Promise<Goal> {
  return api.get<Goal>(`/projects/${projectId}/goals/${goalId}`);
}

export function getGoalProgress(
  projectId: string,
  goalId: string,
): Promise<GoalProgress> {
  return api.get<GoalProgress>(
    `/projects/${projectId}/goals/${goalId}/progress`,
  );
}
