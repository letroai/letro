// server/src/services/company.service.ts
import { eq } from "drizzle-orm";
import {
  companies,
  companyMemberships,
  autonomyLevels,
  budgetPolicies,
} from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { DEFAULT_BUDGET_CENTS, DEFAULT_SOFT_CAP_PERCENT, DEFAULT_HARD_CAP_PERCENT } from "../lib/defaults.js";

/** Default autonomy level seed data */
const DEFAULT_AUTONOMY_LEVELS = [
  {
    level: 1,
    name: "모든 것을 물어볼게요",
    description: "모든 작업 전에 확인을 요청합니다",
    requireTaskApproval: true,
    requireHireApproval: true,
    requireFireApproval: true,
    requireBudgetApproval: true,
    allowTaskCreation: false,
    allowTaskDecomposition: false,
    allowAgentHiring: false,
    allowAgentFiring: false,
    allowExploration: false,
  },
  {
    level: 2,
    name: "중요한 것만 물어볼게요",
    description: "팀원 고용/해고와 비용 관련만 확인을 요청합니다",
    requireTaskApproval: false,
    requireHireApproval: true,
    requireFireApproval: true,
    requireBudgetApproval: true,
    allowTaskCreation: true,
    allowTaskDecomposition: true,
    allowAgentHiring: false,
    allowAgentFiring: false,
    allowExploration: false,
  },
  {
    level: 3,
    name: "비용만 조심할게요",
    description: "비용 한도 초과 시에만 확인을 요청합니다",
    requireTaskApproval: false,
    requireHireApproval: false,
    requireFireApproval: false,
    requireBudgetApproval: true,
    allowTaskCreation: true,
    allowTaskDecomposition: true,
    allowAgentHiring: true,
    allowAgentFiring: true,
    allowExploration: true,
  },
  {
    level: 4,
    name: "알아서 할게요",
    description: "모든 것을 자율적으로 처리합니다",
    requireTaskApproval: false,
    requireHireApproval: false,
    requireFireApproval: false,
    requireBudgetApproval: false,
    allowTaskCreation: true,
    allowTaskDecomposition: true,
    allowAgentHiring: true,
    allowAgentFiring: true,
    allowExploration: true,
  },
];

/**
 * Company (organization) CRUD and initial setup service.
 *
 * Automatically seeds default autonomy levels and budget policies on company creation.
 * Exposed to end-users as a "project" (higher-level concept).
 */
export class CompanyService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Lists all companies.
   */
  async list() {
    return this.db.select().from(companies);
  }

  /**
   * Retrieves a company by ID.
   */
  async getById(id: string) {
    const result = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });
    return result ?? null;
  }

  /**
   * Creates a new company.
   *
   * Creates company + membership (owner) + autonomy levels + budget policy atomically in a transaction.
   *
   * @param input - Company info (name, slug, etc.)
   * @param userId - Creator (registered as owner)
   */
  async create(
    input: {
      name: string;
      slug: string;
      logoUrl?: string;
      defaultAutonomyLevel?: number;
    },
    userId: string,
  ) {
    this.logger.info({ slug: input.slug, userId }, "Creating company");

    return this.db.transaction(async (tx) => {
      // 1. Create company
      const [company] = await tx
        .insert(companies)
        .values(
          omitUndefined({
            name: input.name,
            slug: input.slug,
            logoUrl: input.logoUrl,
            defaultAutonomyLevel: input.defaultAutonomyLevel ?? 4,
          }),
        )
        .returning();

      // 2. Register creator as owner
      await tx.insert(companyMemberships).values({
        companyId: company!.id,
        userId,
        role: "owner",
      });

      // 3. Seed default autonomy levels
      for (const level of DEFAULT_AUTONOMY_LEVELS) {
        await tx.insert(autonomyLevels).values({
          companyId: company!.id,
          ...level,
        });
      }

      // 4. Seed default budget policy (company-wide scope)
      await tx.insert(budgetPolicies).values({
        companyId: company!.id,
        scopeType: "company",
        scopeId: company!.id,
        amountCents: DEFAULT_BUDGET_CENTS,
        periodDays: 30,
        softCapPercent: DEFAULT_SOFT_CAP_PERCENT,
        hardCapPercent: DEFAULT_HARD_CAP_PERCENT,
      });

      this.logger.info(
        { companyId: company!.id },
        "Company created (with autonomy levels + budget policy seeds)",
      );

      return company!;
    });
  }

  /**
   * Partially updates company info.
   */
  async update(
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      logoUrl: string;
      defaultAutonomyLevel: number;
      autoHireEnabled: boolean;
      autoFireEnabled: boolean;
      explorationEnabled: boolean;
      peerReviewRequired: boolean;
      budgetMonthlyCents: number;
    }>,
  ) {
    const [updated] = await this.db
      .update(companies)
      .set(omitUndefined({ ...input, updatedAt: new Date() }))
      .where(eq(companies.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Deletes a company. (cascades to all related data)
   */
  async delete(id: string) {
    this.logger.warn({ companyId: id }, "Deleting company");

    const [deleted] = await this.db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning();

    return deleted ?? null;
  }
}
