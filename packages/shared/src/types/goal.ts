// packages/shared/src/types/goal.ts
import type { GoalStatus, DecompositionStrategy } from "../constants.js";

export interface Goal {
  id: string;
  companyId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: GoalStatus;
  completionCriteria: Record<string, unknown> | null;
  autoDecompose: boolean;
  decompositionStrategy: DecompositionStrategy;
  estimatedTotalTokens: number | null;
  progressPercent: number;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  parentId?: string;
  autoDecompose?: boolean;
}
