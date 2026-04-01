import { api } from "./client";

export interface CostSummary {
  totalCostCents: number;
  totalTokens: number;
  eventCount: number;
  period: string;
}

export function getCostSummary(projectId: string): Promise<CostSummary> {
  return api.get<CostSummary>(`/projects/${projectId}/costs/summary`);
}

export function getCostByAgent(
  projectId: string,
  agentId: string,
): Promise<{ agentId: string; totalCost: number; entries: { date: string; cost: number }[] }> {
  return api.get(`/projects/${projectId}/costs/agents/${agentId}`);
}
