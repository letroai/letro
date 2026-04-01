import { api } from "./client";

export interface HelpRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  agentName: string;
  message: string;
  createdAt: string;
}

export interface DashboardData {
  totalAgents: number;
  activeAgents: number;
  leaderCount: number;
  memberCount: number;
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  completedIssues: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  monthlyCostCents: number;
  budgetRemainingCents: number;
  budgetUsedPercent: number;
  recentActivities: unknown[];
  helpRequests: unknown[];
  userFacingSummary: string;
}

export function getDashboard(projectId: string): Promise<DashboardData> {
  return api.get<DashboardData>(`/projects/${projectId}/dashboard`);
}
