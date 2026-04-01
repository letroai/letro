// server/src/services/autonomy/cost-anomaly-detector.ts
import { eq, and, sql } from "drizzle-orm";
import { costEvents, agents } from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { COST_SPIKE_MULTIPLIER, CASCADE_EVENT_COUNT } from "../../lib/defaults.js";

/**
 * Cost anomaly detection engine.
 *
 * Detects anomalous patterns when cost events occur:
 * - spike: single event cost is 5x or more of the average
 * - cascade: same agent generates 10+ cost events within 5 minutes (suspected infinite loop)
 *
 * On anomaly detection, logs a warning or pauses the agent.
 */
export class CostAnomalyDetector {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Performs anomaly detection after a cost event.
   *
   * 1. Spike: warns if single event cost exceeds 5x of 7-day average
   * 2. Cascade: pauses agent if 10+ events within 5 minutes
   *
   * @param companyId - Company ID
   * @param costCents - Cost of this event (cents)
   * @param agentId - Agent ID that generated the event
   */
  async checkEvent(
    companyId: string,
    costCents: number,
    agentId: string,
  ): Promise<void> {
    // 1. Spike detection
    const avgCost = await this.getAverageCost(companyId);
    if (avgCost > 0 && costCents > avgCost * COST_SPIKE_MULTIPLIER) {
      this.logger.warn(
        {
          companyId,
          agentId,
          costCents,
          avgCost,
          multiplier: Math.round(costCents / avgCost),
        },
        "Cost spike detected: single event cost exceeds 5x average",
      );
    }

    // 2. Cascade detection
    const recentCount = await this.getRecentAgentEventCount(agentId);
    if (recentCount >= CASCADE_EVENT_COUNT) {
      this.logger.warn(
        { companyId, agentId, recentCount },
        "Cost cascade detected: 10+ events in 5 minutes — pausing agent",
      );

      // Pause the agent
      await this.db
        .update(agents)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(agents.id, agentId));
    }
  }

  /**
   * Returns average cost (cents) over the last 7 days.
   */
  private async getAverageCost(companyId: string): Promise<number> {
    const result = await this.db
      .select({
        avg: sql<number>`COALESCE(AVG(${costEvents.amountCents}), 0)`,
      })
      .from(costEvents)
      .where(
        and(
          eq(costEvents.companyId, companyId),
          sql`${costEvents.occurredAt} > NOW() - INTERVAL '7 days'`,
        ),
      );

    return Number(result[0]?.avg ?? 0);
  }

  /**
   * Returns the count of cost events for the given agent in the last 5 minutes.
   */
  private async getRecentAgentEventCount(agentId: string): Promise<number> {
    const result = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(costEvents)
      .where(
        and(
          eq(costEvents.agentId, agentId),
          sql`${costEvents.occurredAt} > NOW() - INTERVAL '5 minutes'`,
        ),
      );

    return Number(result[0]?.count ?? 0);
  }
}
