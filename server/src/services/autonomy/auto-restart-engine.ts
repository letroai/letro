// server/src/services/autonomy/auto-restart-engine.ts
import { eq, and, sql, desc } from "drizzle-orm";
import { agentRuntimeState, heartbeatRuns, issues } from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { CONSECUTIVE_FAILURE_THRESHOLD } from "../../lib/defaults.js";

/**
 * Auto-restart engine.
 *
 * Determines whether to auto-restart a member agent after heartbeat run completion.
 * Applies backoff based on consecutive failure count, and pauses
 * the agent after 3+ consecutive failures.
 */
export class AutoRestartEngine {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Determines whether an agent should be auto-restarted.
   *
   * Checks agent_runtime_state.consecutiveFailures:
   * - < 3: Restart (reset or increment consecutive failure counter)
   * - >= 3: Pause agent
   *
   * @param agentId - Agent ID
   * @returns { restarted: boolean, reason: string }
   */
  async checkAndRestart(agentId: string): Promise<{ restarted: boolean; reason: string }> {
    // 1. Query agent_runtime_state
    const runtimeState = await this.db.query.agentRuntimeState.findFirst({
      where: eq(agentRuntimeState.agentId, agentId),
    });

    // If no runtime state exists, allow restart after creation
    if (!runtimeState) {
      this.logger.debug({ agentId }, "No runtime state found, allowing restart");
      return { restarted: true, reason: "Runtime state initialized" };
    }

    const consecutiveFailures = runtimeState.consecutiveFailures;

    // 2. Verify consecutive failures from recent heartbeat_runs (auxiliary check)
    const recentRuns = await this.db
      .select({ status: heartbeatRuns.status })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.agentId, agentId))
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(5);

    const recentConsecutiveFailures = this.countConsecutiveFailures(
      recentRuns.map((r) => r.status),
    );

    // Use the larger value between runtime_state and actual run records
    const effectiveFailures = Math.max(consecutiveFailures, recentConsecutiveFailures);

    // 3. Pause on 3+ consecutive failures
    if (effectiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
      this.logger.warn(
        { agentId, consecutiveFailures: effectiveFailures },
        "Agent paused after 3+ consecutive failures",
      );

      // Update agent_runtime_state
      await this.db
        .update(agentRuntimeState)
        .set({
          consecutiveFailures: effectiveFailures,
          updatedAt: new Date(),
        })
        .where(eq(agentRuntimeState.agentId, agentId));

      return {
        restarted: false,
        reason: `${effectiveFailures} consecutive failures — agent paused`,
      };
    }

    // 4. Under 3 failures: allow restart
    this.logger.info(
      { agentId, consecutiveFailures: effectiveFailures },
      "Agent restart allowed",
    );

    return {
      restarted: true,
      reason: effectiveFailures > 0
        ? `${effectiveFailures} consecutive failures but restart allowed`
        : "Normal state",
    };
  }

  /**
   * Increments the consecutive failure counter for an agent.
   * Called when a run fails.
   */
  async incrementFailure(agentId: string): Promise<number> {
    const existing = await this.db.query.agentRuntimeState.findFirst({
      where: eq(agentRuntimeState.agentId, agentId),
    });

    if (!existing) {
      // Create runtime state if it doesn't exist
      await this.db.insert(agentRuntimeState).values({
        agentId,
        consecutiveFailures: 1,
        lastHeartbeatAt: new Date(),
      });
      return 1;
    }

    const newCount = existing.consecutiveFailures + 1;
    await this.db
      .update(agentRuntimeState)
      .set({
        consecutiveFailures: newCount,
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentRuntimeState.agentId, agentId));

    return newCount;
  }

  /**
   * Resets the consecutive failure counter for an agent.
   * Called when a run succeeds.
   */
  async resetFailures(agentId: string): Promise<void> {
    const existing = await this.db.query.agentRuntimeState.findFirst({
      where: eq(agentRuntimeState.agentId, agentId),
    });

    if (!existing) {
      await this.db.insert(agentRuntimeState).values({
        agentId,
        consecutiveFailures: 0,
        lastHeartbeatAt: new Date(),
      });
      return;
    }

    await this.db
      .update(agentRuntimeState)
      .set({
        consecutiveFailures: 0,
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentRuntimeState.agentId, agentId));
  }

  /**
   * Calculates consecutive failure count.
   * Counts failures from most recent run backwards until the first success.
   */
  private countConsecutiveFailures(statuses: string[]): number {
    let count = 0;
    for (const status of statuses) {
      if (status === "failed") {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}
