// server/src/services/notification.service.ts
import { eq, and, desc, sql } from "drizzle-orm";
import { activityLog } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";

/**
 * Notification/Inbox service.
 *
 * Provides a unified inbox view of all important events:
 * - Agent activity (task completed, hired, fired)
 * - Approval requests
 * - Budget warnings
 * - Errors requiring attention
 *
 * MVP: Uses activity_log as the notification source.
 * Read/unread state is tracked per-user via lastReadAt timestamp.
 */

interface InboxItem {
  id: string;
  kind: string;
  entityType: string | null;
  entityId: string | null;
  agentId: string | null;
  summary: string | null;
  details: unknown;
  occurredAt: Date;
}

export class NotificationService {
  private db;
  private logger;
  // In-memory last-read timestamp (MVP: single user, persists in memory only)
  private lastReadAt: Date | null = null;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /** Gets inbox items (recent activity log entries). */
  async getInbox(companyId: string, options?: { limit?: number; offset?: number }): Promise<InboxItem[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const items = await this.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.companyId, companyId))
      .orderBy(desc(activityLog.occurredAt))
      .limit(limit)
      .offset(offset);

    return items.map((item) => ({
      id: item.id,
      kind: item.kind,
      entityType: item.entityType,
      entityId: item.entityId,
      agentId: item.agentId,
      summary: item.summary,
      details: item.details,
      occurredAt: item.occurredAt,
    }));
  }

  /** Counts unread notifications since lastReadAt. */
  async getUnreadCount(companyId: string): Promise<number> {
    if (!this.lastReadAt) {
      const result = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityLog)
        .where(eq(activityLog.companyId, companyId));
      return result[0]?.count ?? 0;
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLog)
      .where(and(
        eq(activityLog.companyId, companyId),
        sql`${activityLog.occurredAt} > ${this.lastReadAt}`,
      ));

    return result[0]?.count ?? 0;
  }

  /** Marks all notifications as read. */
  markAllRead() {
    this.lastReadAt = new Date();
  }
}
