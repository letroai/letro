// packages/shared/src/types/task.ts
import type { IssueStatus, IssueOriginKind, IssuePriority } from "../constants.js";

export interface Task {
  id: string;
  companyId: string;
  projectId: string | null;
  goalId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeAgentId: string | null;
  originKind: IssueOriginKind;
  autoApproved: boolean;
  generatedByRuleId: string | null;
  estimatedTokens: number | null;
  actualTokens: number | null;
  peerReviewStatus: string;
  reviewerAgentId: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  priority?: IssuePriority;
  assigneeAgentId?: string;
}
