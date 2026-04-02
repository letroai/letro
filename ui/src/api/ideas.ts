import { api } from "./client";

export interface Idea {
  id: string;
  userId: string | null;
  companyId: string;
  rawText: string;
  status: "pending" | "structuring" | "structured" | "analyzed" | "activated" | "rejected";
  structured?: Record<string, unknown> | null;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdeaInput {
  raw_text: string;
  locale?: "ko" | "en";
}

export interface ActivateIdeaInput {
  confirmed: true;
  locale?: "ko" | "en";
}

export function createIdea(input: CreateIdeaInput): Promise<Idea> {
  return api.post<Idea>("/ideas", input);
}

export function getIdea(id: string): Promise<Idea> {
  return api.get<Idea>(`/ideas/${id}`);
}

export function activateIdea(
  id: string,
  input: ActivateIdeaInput,
): Promise<{ projectId: string }> {
  return api.post<{ projectId: string }>(`/ideas/${id}/activate`, input);
}
