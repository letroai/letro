import { api } from "./client";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  budgetCeiling: number | null;
  totalCost: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  teamRole: "leader" | "member";
  status: "active" | "paused" | "idle" | "error";
  currentTask: string | null;
  createdAt: string;
}

export interface TeamStructure {
  leader: TeamMember | null;
  members: TeamMember[];
  totalCount: number;
}

export function listProjects(): Promise<Project[]> {
  return api.get<Project[]>("/projects");
}

export function getProject(id: string): Promise<Project> {
  return api.get<Project>(`/projects/${id}`);
}

export function getTeam(projectId: string): Promise<TeamStructure> {
  return api.get<TeamStructure>(`/projects/${projectId}/team`);
}

export function pauseProject(projectId: string): Promise<{ paused: boolean; agentsPaused: number; tasksReset: number }> {
  return api.post(`/projects/${projectId}/pause`);
}

export function resumeProject(projectId: string): Promise<{ paused: boolean; membersResumed: number }> {
  return api.post(`/projects/${projectId}/resume`);
}
