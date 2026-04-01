// packages/shared/src/types/company.ts

export interface Company {
  id: string;
  name: string;
  slug: string;
  defaultAutonomyLevel: number;
  tokenBudgetMonthly: number | null;
  autoHireEnabled: boolean;
  autoFireEnabled: boolean;
  explorationEnabled: boolean;
  peerReviewRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  name: string;
  slug?: string;
}
