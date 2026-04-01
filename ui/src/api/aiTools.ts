import { api } from "./client";

export interface AITool {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  version: string | null;
  setupGuide: string;
}

export interface AIToolsStatus {
  tools: AITool[];
  availableCount: number;
  ready: boolean;
  recommended: AITool | null;
}

export function getAITools(): Promise<AIToolsStatus> {
  return api.get<AIToolsStatus>("/ai-tools");
}
