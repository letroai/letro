// packages/shared/src/types/project.ts

export interface Project {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  leaderAgentId: string;
  autonomyLevelOverride: number | null;
  autoTaskGeneration: boolean;
  repoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  repoUrl?: string;
}
