// server/src/services/issue.service.ts
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { issues, issueComments, companies } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";

/**
 * Issue (task) CRUD and atomic checkout service.
 *
 * Displayed as "task" in the UI.
 * Agents must acquire an atomic lock via checkout() before executing an issue.
 */
export class IssueService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Lists issues with optional filters and pagination.
   *
   * @param companyId - Company ID
   * @param filters - Optional filters (status, priority, goalId, projectId, assigneeAgentId, originKind, page, limit)
   * @returns { issues, total }
   */
  async list(
    companyId: string,
    filters?: {
      status?: string;
      priority?: string;
      goalId?: string;
      projectId?: string;
      assigneeAgentId?: string;
      originKind?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(issues.companyId, companyId)];

    if (filters?.status) {
      conditions.push(eq(issues.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(issues.priority, filters.priority));
    }
    if (filters?.goalId) {
      conditions.push(eq(issues.goalId, filters.goalId));
    }
    if (filters?.projectId) {
      conditions.push(eq(issues.projectId, filters.projectId));
    }
    if (filters?.assigneeAgentId) {
      conditions.push(eq(issues.assigneeAgentId, filters.assigneeAgentId));
    }
    if (filters?.originKind) {
      conditions.push(eq(issues.originKind, filters.originKind));
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(issues)
        .where(where)
        .orderBy(desc(issues.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(issues)
        .where(where),
    ]);

    return {
      issues: rows,
      total: countResult[0]?.total ?? 0,
      page,
      limit,
    };
  }

  /**
   * Retrieves an issue by ID.
   */
  async getById(id: string) {
    const result = await this.db.query.issues.findFirst({
      where: eq(issues.id, id),
    });
    return result ?? null;
  }

  /**
   * Creates a new issue (manual creation).
   *
   * @param companyId - Company ID
   * @param input - Issue info
   * @param actor - Creator info ({ agentId } or { userId })
   */
  async create(
    companyId: string,
    input: {
      title: string;
      description?: string;
      priority?: string;
      goalId?: string;
      projectId?: string;
      parentId?: string;
      assigneeAgentId?: string;
    },
    actor: { agentId?: string; userId?: string },
  ) {
    this.logger.info(
      { companyId, title: input.title },
      "Creating issue",
    );

    const [issue] = await this.db
      .insert(issues)
      .values(
        omitUndefined({
          companyId,
          title: input.title,
          description: input.description,
          status: "backlog",
          priority: input.priority ?? "medium",
          goalId: input.goalId,
          projectId: input.projectId,
          parentId: input.parentId,
          assigneeAgentId: input.assigneeAgentId,
          originKind: "manual",
          createdByAgentId: actor.agentId,
          createdByUserId: actor.userId,
        }),
      )
      .returning();

    return issue!;
  }

  /**
   * Partially updates issue info.
   */
  async update(
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      goalId: string;
      projectId: string;
      parentId: string;
      assigneeAgentId: string;
      sortOrder: number;
      estimatedTokens: number;
      actualTokens: number;
      peerReviewStatus: string;
      reviewerAgentId: string;
      metadata: Record<string, unknown>;
    }>,
  ) {
    const [updated] = await this.db
      .update(issues)
      .set(omitUndefined({ ...input, updatedAt: new Date() }))
      .where(eq(issues.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Deletes an issue.
   */
  async delete(id: string) {
    this.logger.warn({ issueId: id }, "Deleting issue");

    const [deleted] = await this.db
      .delete(issues)
      .where(eq(issues.id, id))
      .returning();

    return deleted ?? null;
  }

  /**
   * Atomically checks out (locks) an issue.
   *
   * Prevents concurrent checkouts via SQL WHERE conditions:
   * - status IN ('todo', 'backlog')
   * - assignee IS NULL OR assignee = requesting agent
   *
   * If 0 rows are updated, another agent has already checked it out, so a 409 error is thrown.
   *
   * @param issueId - Issue ID
   * @param agentId - Agent ID checking out
   * @returns Updated issue
   * @throws 409 error if already checked out
   */
  async checkout(issueId: string, agentId: string) {
    this.logger.info({ issueId, agentId }, "Issue checkout attempt");

    const result = await this.db
      .update(issues)
      .set({
        status: "in_progress",
        assigneeAgentId: agentId,
        checkedOutBy: agentId,
        checkedOutAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(issues.id, issueId),
          inArray(issues.status, ["todo", "backlog"]),
          sql`(${issues.assigneeAgentId} IS NULL OR ${issues.assigneeAgentId} = ${agentId})`,
        ),
      )
      .returning();

    if (result.length === 0) {
      const error = new Error(`Cannot checkout issue (already in progress or assigned to another agent): ${issueId}`);
      (error as Error & { status: number }).status = 409;
      throw error;
    }

    this.logger.info({ issueId, agentId }, "Issue checkout succeeded");
    return result[0]!;
  }

  /**
   * Releases an issue checkout.
   *
   * Reverts status to 'todo' and removes checkout info.
   *
   * @param issueId - Issue ID
   */
  async release(issueId: string) {
    this.logger.info({ issueId }, "Issue checkout released");

    const [released] = await this.db
      .update(issues)
      .set({
        status: "todo",
        checkedOutBy: sql`NULL`,
        checkedOutAt: sql`NULL`,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId))
      .returning();

    return released ?? null;
  }

  /**
   * Marks an issue as completed.
   *
   * Changes status to 'done'.
   * Logs when goal_id is present and progress recalculation is needed.
   *
   * @param issueId - Issue ID
   */
  async complete(issueId: string) {
    this.logger.info({ issueId }, "Issue marked completed");

    const [completed] = await this.db
      .update(issues)
      .set({
        status: "done",
        checkedOutBy: sql`NULL`,
        checkedOutAt: sql`NULL`,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId))
      .returning();

    if (completed?.goalId) {
      // TODO: Replace with GoalService.recalculateProgress() in Day 10~11
      this.logger.info(
        { issueId, goalId: completed.goalId },
        "TODO: Goal progress recalculation needed",
      );
    }

    return completed ?? null;
  }

  /**
   * Lists comments for an issue.
   *
   * @param issueId - Issue ID
   */
  async listComments(issueId: string) {
    return this.db
      .select()
      .from(issueComments)
      .where(eq(issueComments.issueId, issueId))
      .orderBy(issueComments.createdAt);
  }

  /**
   * Adds a comment to an issue.
   *
   * @param issueId - Issue ID
   * @param input - Comment info (body, creator)
   */
  async addComment(
    issueId: string,
    input: {
      body: string;
      createdByAgentId?: string;
      createdByUserId?: string;
    },
  ) {
    // Get companyId from issueId
    const issue = await this.getById(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    const [comment] = await this.db
      .insert(issueComments)
      .values(
        omitUndefined({
          companyId: issue.companyId,
          issueId,
          body: input.body,
          createdByAgentId: input.createdByAgentId,
          createdByUserId: input.createdByUserId,
        }),
      )
      .returning();

    return comment!;
  }

  /**
   * Creates an auto-generated issue (by agent/rule).
   *
   * Auto-approval is determined by the company's autonomy level:
   * - autonomyLevel >= 3: autoApproved=true, status='todo' (immediately executable)
   * - autonomyLevel < 3: autoApproved=false, status='backlog' (awaiting user approval)
   *
   * @param companyId - Company ID
   * @param input - Issue info (including originKind)
   * @param generatedByAgentId - Agent ID that generated this
   */
  async createAutoGenerated(
    companyId: string,
    input: {
      title: string;
      description?: string;
      priority?: string;
      goalId?: string;
      projectId?: string;
      parentId?: string;
      originKind: string;
      generatedByRuleId?: string;
    },
    generatedByAgentId: string,
  ) {
    // Query company autonomy level
    const [company] = await this.db
      .select({ defaultAutonomyLevel: companies.defaultAutonomyLevel })
      .from(companies)
      .where(eq(companies.id, companyId));

    const autonomyLevel = company?.defaultAutonomyLevel ?? 4;
    const autoApproved = autonomyLevel >= 3;
    const status = autoApproved ? "todo" : "backlog";

    this.logger.info(
      { companyId, title: input.title, originKind: input.originKind, autoApproved, status },
      "Auto-generated issue",
    );

    const [issue] = await this.db
      .insert(issues)
      .values(
        omitUndefined({
          companyId,
          title: input.title,
          description: input.description,
          status,
          priority: input.priority ?? "medium",
          goalId: input.goalId,
          projectId: input.projectId,
          parentId: input.parentId,
          originKind: input.originKind,
          autoApproved,
          generatedByRuleId: input.generatedByRuleId,
          createdByAgentId: generatedByAgentId,
        }),
      )
      .returning();

    return issue!;
  }
}
