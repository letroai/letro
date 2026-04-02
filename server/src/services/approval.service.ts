// server/src/services/approval.service.ts
import { eq, and, desc } from "drizzle-orm";
import { approvals } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { publishLiveEvent } from "../ws/websocket-server.js";

/**
 * Manages human approval gates for agent actions.
 *
 * Autonomy levels 1-2 ("중요한 건 물어봐") require human approval
 * before agents proceed with certain actions (task creation, hiring, etc.).
 * Level 3+ auto-approves or uses peer review instead.
 */
export class ApprovalService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /** Lists approvals for a company, optionally filtered by status. */
  async list(companyId: string, filters?: { status?: string | undefined; entityType?: string | undefined }) {
    const conditions = [eq(approvals.companyId, companyId)];
    if (filters?.status) conditions.push(eq(approvals.status, filters.status));
    if (filters?.entityType) conditions.push(eq(approvals.entityType, filters.entityType));

    return this.db
      .select()
      .from(approvals)
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt));
  }

  /** Gets a single approval by ID. */
  async getById(id: string) {
    return this.db.query.approvals.findFirst({
      where: eq(approvals.id, id),
    });
  }

  /** Creates a new approval request. */
  async create(
    companyId: string,
    input: {
      entityType: string;
      entityId: string;
      requestedByAgentId?: string;
      requestedByUserId?: string;
    },
  ) {
    const [approval] = await this.db
      .insert(approvals)
      .values(omitUndefined({
        companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        requestedByAgentId: input.requestedByAgentId,
        requestedByUserId: input.requestedByUserId,
        status: "pending",
      }))
      .returning();

    publishLiveEvent(companyId, {
      type: "approval:requested",
      approvalId: approval!.id,
      entityType: input.entityType,
    });

    this.logger.info({ approvalId: approval!.id, entityType: input.entityType }, "Approval requested");
    return approval!;
  }

  /** Approves a pending request. */
  async approve(id: string, userId: string, note?: string) {
    return this.resolve(id, "approved", userId, note);
  }

  /** Rejects a pending request. */
  async reject(id: string, userId: string, note?: string) {
    return this.resolve(id, "rejected", userId, note);
  }

  /** Requests revision on a pending request. */
  async requestRevision(id: string, userId: string, note: string) {
    return this.resolve(id, "revision_requested", userId, note);
  }

  /** Counts pending approvals for a company. */
  async countPending(companyId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(approvals)
      .where(and(
        eq(approvals.companyId, companyId),
        eq(approvals.status, "pending"),
      ));
    return result.length;
  }

  private async resolve(id: string, status: string, userId: string, note?: string) {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Approval not found");
    if (existing.status !== "pending") throw new Error("Approval already resolved");

    const now = new Date();
    const [updated] = await this.db
      .update(approvals)
      .set(omitUndefined({
        status,
        resolvedByUserId: userId,
        resolutionNote: note,
        resolvedAt: now,
        updatedAt: now,
      }))
      .where(eq(approvals.id, id))
      .returning();

    publishLiveEvent(existing.companyId, {
      type: "approval:resolved",
      approvalId: id,
      status,
    });

    this.logger.info({ approvalId: id, status, userId }, "Approval resolved");
    return updated!;
  }
}
