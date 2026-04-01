import { api } from "./client";

export interface AgentDetail {
  id: string;
  projectId: string;
  name: string;
  teamRole: "leader" | "member";
  executionRole: string | null;
  status: "active" | "paused" | "idle" | "error";
  currentTask: string | null;
  totalCost: number;
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export interface HeartbeatRun {
  id: string;
  agentId: string;
  status: "running" | "completed" | "failed";
  summary: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function listAgents(projectId: string): Promise<AgentDetail[]> {
  return api.get<AgentDetail[]>(`/projects/${projectId}/agents`);
}

export function getAgent(
  projectId: string,
  agentId: string,
): Promise<AgentDetail> {
  return api.get<AgentDetail>(`/projects/${projectId}/agents/${agentId}`);
}

export function pauseAgent(
  projectId: string,
  agentId: string,
): Promise<AgentDetail> {
  return api.post<AgentDetail>(
    `/projects/${projectId}/agents/${agentId}/pause`,
  );
}

export function resumeAgent(
  projectId: string,
  agentId: string,
): Promise<AgentDetail> {
  return api.post<AgentDetail>(
    `/projects/${projectId}/agents/${agentId}/resume`,
  );
}
