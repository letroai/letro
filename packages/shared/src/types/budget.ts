// packages/shared/src/types/budget.ts
import type { BudgetScopeType, SoftCapAction, HardCapAction } from "../constants.js";

export interface BudgetPolicy {
  id: string;
  companyId: string;
  scopeType: BudgetScopeType;
  scopeId: string;
  amountCents: number;
  periodDays: number;
  softCapPercent: number;
  softCapAction: SoftCapAction;
  hardCapAction: HardCapAction;
  autoIncreaseEnabled: boolean;
  autoIncreaseMaxPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostEvent {
  id: string;
  companyId: string;
  agentId: string;
  heartbeatRunId: string | null;
  kind: string;
  amountCents: number;
  tokenCount: number | null;
  model: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}
