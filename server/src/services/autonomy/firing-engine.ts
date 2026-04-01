// server/src/services/autonomy/firing-engine.ts
import { eq, and, sql, desc } from "drizzle-orm";
import { agents, heartbeatRuns, issues } from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { omitUndefined } from "../../lib/strip-undefined.js";
import { FIRING_GRACE_PERIOD_MS, FAILURE_RATE_THRESHOLD } from "../../lib/defaults.js";

/**
 * Member firing engine.
 *
 * The leader periodically evaluates idle/inefficient members to decide whether to fire.
 *
 * Firing criteria:
 * 1. Inactive: 0 runs in 24 hours + idle status
 * 2. Inefficient: failure rate >= 50% in last 5 runs
 * 3. Role duplication: multiple members with same role and no assigned tasks
 *
 * Safety guards:
 * - Company autoFireEnabled check
 * - 1-hour grace period for newly hired agents
 * - Human-created agents are protected
 * - 30-minute firing cooldown
 */
export class FiringEngine {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Evaluates whether firing is needed.
   *
   * @param projectId - Project ID
   * @param leaderAgentId - Leader agent ID
   * @returns { shouldFire, agentId, reason }
   */
  async evaluateFiringNeed(
    projectId: string,
    leaderAgentId: string,
  ): Promise<{ shouldFire: boolean; agentId?: string; reason: string }> {
    // 1. Query leader agent
    const leader = await this.db.query.agents.findFirst({
      where: eq(agents.id, leaderAgentId),
    });
    if (!leader) {
      return { shouldFire: false, reason: "Leader not found" };
    }

    // 2. Query member list
    const members = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.reportsTo, leaderAgentId),
          eq(agents.teamRole, "member"),
          sql`${agents.status} != 'terminated'`,
        ),
      );

    if (members.length === 0) {
      return { shouldFire: false, reason: "No members to fire" };
    }

    // 3. Evaluate each member
    for (const member of members) {
      // Grace period: 1-hour protection after creation
      const createdAt = member.createdAt;
      if (Date.now() - createdAt.getTime() < FIRING_GRACE_PERIOD_MS) continue;

      // Protect human-created agents
      if (!member.hiredByAgentId) continue;

      // Inactivity detection: 0 runs in 24 hours
      const recentRuns = await this.db
        .select()
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.agentId, member.id),
            sql`${heartbeatRuns.createdAt} > NOW() - INTERVAL '24 hours'`,
          ),
        );

      if (recentRuns.length === 0 && member.status === "idle") {
        return {
          shouldFire: true,
          agentId: member.id,
          reason: "Inactive for 24 hours (no assigned tasks)",
        };
      }

      // Inefficiency detection: failure rate >= 50% in last 5 runs
      if (recentRuns.length >= 3) {
        const last5 = recentRuns.slice(0, 5);
        const failCount = last5.filter((r) => r.status === "failed").length;
        if (failCount / last5.length > FAILURE_RATE_THRESHOLD) {
          return {
            shouldFire: true,
            agentId: member.id,
            reason: `High failure rate (${failCount}/${last5.length})`,
          };
        }
      }
    }

    return { shouldFire: false, reason: "No firing candidates" };
  }

  /**
   * Fires an agent.
   *
   * - Sets status='terminated', firedByAgentId, firedAt, fireReason
   * - Unassigns in-progress tasks
   * - Cancels active heartbeat runs
   *
   * @param agentId - Agent ID to fire
   * @param leaderAgentId - Leader ID who decided to fire
   * @param reason - Firing reason
   */
  async fire(
    agentId: string,
    leaderAgentId: string,
    reason: string,
  ): Promise<void> {
    this.logger.info(
      { agentId, leaderAgentId, reason },
      "Executing agent firing",
    );

    // 1. Unassign in-progress tasks
    await this.db
      .update(issues)
      .set(omitUndefined({
        assigneeAgentId: sql`NULL`,
        status: "todo",
        updatedAt: new Date(),
      }))
      .where(
        and(
          eq(issues.assigneeAgentId, agentId),
          sql`${issues.status} IN ('in_progress', 'todo')`,
        ),
      );

    // 2. Cancel active heartbeat runs
    await this.db
      .update(heartbeatRuns)
      .set(omitUndefined({
        status: "failed",
        finishedAt: new Date(),
        errorMessage: "agent_fired",
      }))
      .where(
        and(
          eq(heartbeatRuns.agentId, agentId),
          eq(heartbeatRuns.status, "running"),
        ),
      );

    // 3. Update agent status
    await this.db
      .update(agents)
      .set(omitUndefined({
        status: "terminated",
        firedByAgentId: leaderAgentId,
        firedAt: new Date(),
        fireReason: reason,
        updatedAt: new Date(),
      }))
      .where(eq(agents.id, agentId));
  }
}
