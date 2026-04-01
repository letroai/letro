// server/src/services/goal.service.ts
import { eq, and, sql } from "drizzle-orm";
import { goals, issues } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";

/**
 * Goal CRUD and progress calculation service.
 *
 * A Goal represents the top-level direction of a project,
 * and is decomposed into child issues (tasks) for execution.
 */
export class GoalService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Lists goals for a company.
   */
  async list(companyId: string) {
    return this.db
      .select()
      .from(goals)
      .where(eq(goals.companyId, companyId));
  }

  /**
   * Retrieves a goal by ID.
   */
  async getById(id: string) {
    const result = await this.db.query.goals.findFirst({
      where: eq(goals.id, id),
    });
    return result ?? null;
  }

  /**
   * Creates a new goal.
   *
   * @param companyId - Company ID
   * @param input - Goal info
   */
  async create(
    companyId: string,
    input: {
      title: string;
      description?: string;
      parentId?: string;
      status?: string;
      autoDecompose?: boolean;
      decompositionStrategy?: string;
      createdByAgentId?: string;
      createdByUserId?: string;
    },
  ) {
    this.logger.info({ companyId, title: input.title }, "Creating goal");

    const [goal] = await this.db
      .insert(goals)
      .values(
        omitUndefined({
          companyId,
          title: input.title,
          description: input.description,
          parentId: input.parentId,
          status: input.status ?? "draft",
          autoDecompose: input.autoDecompose ?? true,
          decompositionStrategy: input.decompositionStrategy ?? "balanced",
          createdByAgentId: input.createdByAgentId,
          createdByUserId: input.createdByUserId,
        }),
      )
      .returning();

    return goal!;
  }

  /**
   * Partially updates goal info.
   */
  async update(
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: string;
      progressPercent: number;
      autoDecompose: boolean;
      decompositionStrategy: string;
      completionCriteria: unknown;
    }>,
  ) {
    const [updated] = await this.db
      .update(goals)
      .set(omitUndefined({ ...input, updatedAt: new Date() }))
      .where(eq(goals.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Deletes a goal.
   */
  async delete(id: string) {
    this.logger.warn({ goalId: id }, "Deleting goal");

    const [deleted] = await this.db
      .delete(goals)
      .where(eq(goals.id, id))
      .returning();

    return deleted ?? null;
  }

  /**
   * Calculates progress for a goal.
   *
   * Computed as the ratio of completed issues to total issues.
   *
   * @param goalId - Goal ID
   * @returns Total issues, completed issues, completion percent
   */
  async getProgress(goalId: string) {
    const [result] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${issues.status} = 'done')::int`,
      })
      .from(issues)
      .where(and(eq(issues.goalId, goalId)));

    const total = result?.total ?? 0;
    const completed = result?.completed ?? 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percent };
  }
}
