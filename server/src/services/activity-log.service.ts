// server/src/services/activity-log.service.ts
import { eq, and, desc, sql } from "drizzle-orm";
import { activityLog } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";

/**
 * Activity log service.
 *
 * Records major system events (agent creation, issue completion, budget exceeded, etc.)
 * in the activity_log table and provides query access.
 *
 * Exposed to users as "Recent Activity" or project timeline in the UI.
 */
export class ActivityLogService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Records an activity log entry.
   *
   * @param event - Log event info
   * @returns Created log record
   */
  async log(event: {
    companyId: string;
    kind: string;
    entityType?: string;
    entityId?: string;
    agentId?: string;
    userId?: string;
    summary?: string;
    details?: Record<string, unknown>;
  }) {
    this.logger.debug(
      { companyId: event.companyId, kind: event.kind, entityType: event.entityType },
      "Recording activity log",
    );

    const [row] = await this.db
      .insert(activityLog)
      .values(
        omitUndefined({
          companyId: event.companyId,
          kind: event.kind,
          entityType: event.entityType,
          entityId: event.entityId,
          agentId: event.agentId,
          userId: event.userId,
          summary: event.summary,
          details: event.details,
        }),
      )
      .returning();

    return row!;
  }

  /**
   * Lists activity logs (reverse occurredAt order, with pagination).
   *
   * @param companyId - Company ID
   * @param filters - Optional filters (kind, agentId, entityType, entityId, page, limit)
   */
  async list(
    companyId: string,
    filters?: {
      kind?: string;
      agentId?: string;
      entityType?: string;
      entityId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(activityLog.companyId, companyId)];

    if (filters?.kind) {
      conditions.push(eq(activityLog.kind, filters.kind));
    }
    if (filters?.agentId) {
      conditions.push(eq(activityLog.agentId, filters.agentId));
    }
    if (filters?.entityType) {
      conditions.push(eq(activityLog.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(activityLog.entityId, filters.entityId));
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(activityLog)
        .where(where)
        .orderBy(desc(activityLog.occurredAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(activityLog)
        .where(where),
    ]);

    return {
      logs: rows,
      total: countResult[0]?.total ?? 0,
      page,
      limit,
    };
  }
}
