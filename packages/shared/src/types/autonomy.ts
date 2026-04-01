// packages/shared/src/types/autonomy.ts
import type { AutonomyLevelName } from "../constants.js";

export interface AutonomyLevel {
  id: string;
  companyId: string;
  level: number;
  name: AutonomyLevelName;
  description: string | null;
  requireTaskApproval: boolean;
  requireHireApproval: boolean;
  requireFireApproval: boolean;
  requireBudgetApproval: boolean;
  allowTaskCreation: boolean;
  allowTaskDecomposition: boolean;
  allowAgentHiring: boolean;
  allowAgentFiring: boolean;
  allowExploration: boolean;
  maxCostPerActionCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}
