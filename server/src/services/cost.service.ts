// server/src/services/cost.service.ts
import { eq, and, sql, gte, desc, sum } from "drizzle-orm";
import { costEvents, agents } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { LLM_PRICING, DEFAULT_LLM_MODEL } from "../lib/defaults.js";

interface CreateCostEventInput {
  agentId: string;
  heartbeatRunId?: string;
  inputTokens: number;
  outputTokens: number;
  model?: string;
  costCents?: number;
  kind?: string;
}

interface CostSummaryFilters {
  period: "day" | "week" | "month" | "all";
  startDate?: string;
  endDate?: string;
}

/**
 * Cost event recording/aggregation service.
 *
 * Records cost events generated per LLM call,
 * and aggregates costs by period/agent.
 *
 * Displayed to users as "This month's cost: ~$X.XX" in the UI.
 */
export class CostService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Records a cost event.
   *
   * Automatically calculates cost in cents from token counts.
   * Should call budgetService.checkAfterCostEvent after recording,
   * but handled by the caller due to circular dependency (TODO).
   *
   * @param companyId - Company ID
   * @param input - Cost event info
   * @returns Created cost event record
   */
  async createEvent(companyId: string, input: CreateCostEventInput) {
    const costCents =
      input.costCents ??
      this.calculateCost(input.inputTokens, input.outputTokens, input.model);

    const totalTokens = input.inputTokens + input.outputTokens;

    this.logger.info(
      { companyId, agentId: input.agentId, costCents, totalTokens },
      "Cost event recorded",
    );

    const [event] = await this.db
      .insert(costEvents)
      .values(
        omitUndefined({
          companyId,
          agentId: input.agentId,
          heartbeatRunId: input.heartbeatRunId,
          kind: input.kind ?? "task",
          amountCents: costCents,
          tokenCount: totalTokens,
          model: input.model ?? DEFAULT_LLM_MODEL,
          metadata: {
            inputTokens: input.inputTokens,
            outputTokens: input.outputTokens,
          },
        }),
      )
      .returning();

    // TODO: budgetService.checkAfterCostEvent(companyId, costCents)
    // Must be handled by caller due to circular dependency

    return event!;
  }

  /**
   * Returns a cost summary for a given period.
   *
   * @param companyId - Company ID
   * @param filters - Period filter (day/week/month/all)
   * @returns Total cost, total tokens, event count, user-facing string
   */
  async getSummary(companyId: string, filters: CostSummaryFilters) {
    const dateCondition = this.buildDateCondition(filters);

    const result = await this.db
      .select({
        totalCostCents: sum(costEvents.amountCents).mapWith(Number),
        totalTokens: sum(costEvents.tokenCount).mapWith(Number),
        eventCount: sql<number>`count(*)::int`,
      })
      .from(costEvents)
      .where(and(eq(costEvents.companyId, companyId), dateCondition));

    const row = result[0];
    const totalCostCents = row?.totalCostCents ?? 0;
    const totalTokens = row?.totalTokens ?? 0;
    const eventCount = row?.eventCount ?? 0;

    const periodLabel = filters.period === "month" ? "달" : "기간";

    return {
      totalCostCents,
      totalTokens,
      eventCount,
      period: filters.period,
      userFacing: `이번 ${periodLabel} 비용: 약 $${(totalCostCents / 100).toFixed(2)}`,
    };
  }

  /**
   * Returns cost aggregation by agent.
   *
   * @param companyId - Company ID
   * @param period - Period (default: month)
   */
  async getByAgent(companyId: string, period = "month") {
    const dateCondition = this.buildDateCondition({
      period: period as CostSummaryFilters["period"],
    });

    const result = await this.db
      .select({
        agentId: costEvents.agentId,
        agentName: agents.name,
        memberType: agents.memberType,
        totalCostCents: sum(costEvents.amountCents).mapWith(Number),
        totalTokens: sum(costEvents.tokenCount).mapWith(Number),
        eventCount: sql<number>`count(*)::int`,
      })
      .from(costEvents)
      .innerJoin(agents, eq(costEvents.agentId, agents.id))
      .where(and(eq(costEvents.companyId, companyId), dateCondition))
      .groupBy(costEvents.agentId, agents.name, agents.memberType)
      .orderBy(desc(sum(costEvents.amountCents)));

    return result.map((r) => ({
      agentId: r.agentId,
      agentName: r.agentName,
      memberType: r.memberType,
      totalCostCents: r.totalCostCents ?? 0,
      totalTokens: r.totalTokens ?? 0,
      eventCount: r.eventCount,
    }));
  }

  /**
   * Returns total spend for the current month (for budget window).
   *
   * @param companyId - Company ID
   * @returns Total spend in cents
   */
  async getWindowSpend(companyId: string): Promise<number> {
    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${costEvents.amountCents}), 0)`,
      })
      .from(costEvents)
      .where(
        and(
          eq(costEvents.companyId, companyId),
          gte(costEvents.occurredAt, sql`date_trunc('month', NOW())`),
        ),
      );

    return Number(result[0]?.total ?? 0);
  }

  /**
   * Converts token counts to cost in cents.
   *
   * Model pricing:
   * - Sonnet: input $3/1M, output $15/1M
   * - Opus:   input $15/1M, output $75/1M
   * - Haiku:  input $0.25/1M, output $1.25/1M
   */
  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    model?: string,
  ): number {
    const price = LLM_PRICING[model ?? DEFAULT_LLM_MODEL] ?? LLM_PRICING[DEFAULT_LLM_MODEL]!;
    const inputCost = (inputTokens / 1000) * price.input;
    const outputCost = (outputTokens / 1000) * price.output;
    return Math.ceil(inputCost + outputCost);
  }

  /**
   * Converts period filter to SQL condition.
   */
  private buildDateCondition(filters: CostSummaryFilters) {
    if (filters.startDate && filters.endDate) {
      return and(
        gte(costEvents.occurredAt, new Date(filters.startDate)),
        sql`${costEvents.occurredAt} <= ${new Date(filters.endDate)}`,
      );
    }

    switch (filters.period) {
      case "day":
        return gte(costEvents.occurredAt, sql`NOW() - INTERVAL '1 day'`);
      case "week":
        return gte(costEvents.occurredAt, sql`NOW() - INTERVAL '7 days'`);
      case "month":
        return gte(costEvents.occurredAt, sql`date_trunc('month', NOW())`);
      default:
        return sql`1=1`;
    }
  }
}
