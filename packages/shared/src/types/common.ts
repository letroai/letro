// packages/shared/src/types/common.ts

/** Common fields for all entities */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Common fields for company-scoped entities */
export interface CompanyEntity extends BaseEntity {
  companyId: string;
}

/** Dual actor (who created it) */
export interface DualActor {
  createdByAgentId: string | null;
  createdByUserId: string | null;
}

/** Pagination parameters */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Pagination response meta */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
