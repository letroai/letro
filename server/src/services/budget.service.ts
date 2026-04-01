// server/src/services/budget.service.ts
import { eq, and, sql, desc } from "drizzle-orm";
import { budgetPolicies, budgetIncidents, agents } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { BUDGET_INCREASE_FACTOR } from "../lib/defaults.js";

interface BudgetOverview {
  amountCents: number;
  spentCents: number;
  remainingCents: number;
  usedPercent: number;
}

interface BudgetCheckResult {
  status: "ok" | "soft_cap" | "hard_stop";
  remainingCents: number;
  usedPercent: number;
  message?: string;
}

/**
 * Budget management service.
 *
 * Evaluates soft/hard caps based on company budget policies,
 * and creates incidents when exceeded.
 *
 * Displayed as "cost limit" in the UI.
 */
export class BudgetService {
  private db;
  private logger;
  private getWindowSpend: (companyId: string) => Promise<number>;

  constructor(
    deps: ServiceDependencies,
    getWindowSpend: (companyId: string) => Promise<number>,
  ) {
    this.db = deps.db;
    this.logger = deps.logger;
    this.getWindowSpend = getWindowSpend;
  }

  /**
   * Returns budget overview.
   *
   * Calculates current period budget, usage, and remaining balance.
   *
   * @param companyId - Company ID
   * @returns Budget overview (amountCents, spentCents, remainingCents, usedPercent)
   */
  async getOverview(companyId: string): Promise<BudgetOverview> {
    const policy = await this.db.query.budgetPolicies.findFirst({
      where: and(
        eq(budgetPolicies.companyId, companyId),
        eq(budgetPolicies.scopeType, "company"),
      ),
    });

    if (!policy) {
      return { amountCents: 0, spentCents: 0, remainingCents: 0, usedPercent: 0 };
    }

    const spentCents = await this.getWindowSpend(companyId);

    const amountCents = policy.amountCents;
    const remainingCents = Math.max(0, amountCents - spentCents);
    const usedPercent = amountCents > 0 ? Math.round((spentCents / amountCents) * 100) : 0;

    return { amountCents, spentCents, remainingCents, usedPercent };
  }

  /**
   * Performs a budget check (hard/soft cap evaluation).
   *
   * Called from heartbeat startRun to verify budget before agent execution.
   * - hard_stop: Agent execution blocked
   * - soft_cap: Continue with warning
   * - ok: Normal
   *
   * @param companyId - Company ID
   * @returns Budget check result
   */
  async enforceBudgetCheck(companyId: string): Promise<BudgetCheckResult> {
    const policy = await this.db.query.budgetPolicies.findFirst({
      where: and(
        eq(budgetPolicies.companyId, companyId),
        eq(budgetPolicies.scopeType, "company"),
      ),
    });

    if (!policy) {
      return { status: "ok", remainingCents: Infinity, usedPercent: 0 };
    }

    const spentCents = await this.getWindowSpend(companyId);

    const budgetAmount = policy.amountCents;
    const usedPercent = budgetAmount > 0 ? (spentCents / budgetAmount) * 100 : 0;
    const remaining = budgetAmount - spentCents;

    // Check hard cap
    if (usedPercent >= (policy.hardCapPercent ?? 100)) {
      const action = policy.hardCapAction ?? "notify_and_pause";

      if (action === "hard_stop" || action === "notify_and_pause") {
        await this.createIncident(companyId, policy.id, "hard_cap", spentCents, budgetAmount);
        return { status: "hard_stop", remainingCents: remaining, usedPercent };
      }

      // notify_only: Notify only, continue execution
      await this.createIncident(companyId, policy.id, "hard_cap", spentCents, budgetAmount);
      return {
        status: "ok",
        remainingCents: remaining,
        usedPercent,
        message: "Budget exceeded (notification sent)",
      };
    }

    // Check soft cap
    if (usedPercent >= (policy.softCapPercent ?? 80)) {
      const action = policy.softCapAction ?? "notify";

      if (action === "pause") {
        return { status: "soft_cap", remainingCents: remaining, usedPercent };
      }

      // notify or slow_down
      await this.createIncident(companyId, policy.id, "soft_cap", spentCents, budgetAmount);
      return { status: "ok", remainingCents: remaining, usedPercent };
    }

    return { status: "ok", remainingCents: remaining, usedPercent };
  }

  /**
   * Lightweight budget status check after a cost event.
   *
   * Creates incidents when soft/hard caps are reached.
   *
   * @param companyId - Company ID
   * @param costCents - Incurred cost (cents)
   */
  async checkAfterCostEvent(companyId: string, costCents: number): Promise<void> {
    this.logger.debug(
      { companyId, costCents },
      "Budget check after cost event",
    );

    const result = await this.enforceBudgetCheck(companyId);

    if (result.status === "hard_stop") {
      this.logger.warn(
        { companyId, usedPercent: result.usedPercent },
        "Hard cap reached — agent pause required",
      );
    } else if (result.status === "soft_cap") {
      this.logger.info(
        { companyId, usedPercent: result.usedPercent },
        "Soft cap reached — warning notification",
      );
    }
  }

  /**
   * Returns remaining budget (cents).
   *
   * @param companyId - Company ID
   * @returns Remaining budget (cents)
   */
  async getRemainingBudget(companyId: string): Promise<number> {
    const overview = await this.getOverview(companyId);
    return overview.remainingCents;
  }

  /**
   * Returns list of budget incidents.
   *
   * @param companyId - Company ID
   */
  async listIncidents(companyId: string) {
    return this.db
      .select()
      .from(budgetIncidents)
      .where(eq(budgetIncidents.companyId, companyId))
      .orderBy(desc(budgetIncidents.createdAt));
  }

  /**
   * Processes user response to an incident.
   *
   * - increase_budget: Increase budget by 20%
   * - stop: Pause all agents
   * - ignore: Do nothing
   *
   * @param incidentId - Incident ID
   * @param response - User response
   */
  async respondToIncident(
    incidentId: string,
    response: "increase_budget" | "stop" | "ignore",
  ): Promise<void> {
    const incident = await this.db.query.budgetIncidents.findFirst({
      where: eq(budgetIncidents.id, incidentId),
    });
    if (!incident) {
      throw new Error("인시던트를 찾을 수 없어요");
    }

    this.logger.info(
      { incidentId, response, companyId: incident.companyId },
      "Processing incident response",
    );

    switch (response) {
      case "increase_budget": {
        // Increase budget by 20%
        const policy = await this.db.query.budgetPolicies.findFirst({
          where: and(
            eq(budgetPolicies.companyId, incident.companyId),
            eq(budgetPolicies.scopeType, "company"),
          ),
        });
        if (policy) {
          const newAmount = Math.ceil(policy.amountCents * BUDGET_INCREASE_FACTOR);
          await this.db
            .update(budgetPolicies)
            .set(omitUndefined({ amountCents: newAmount, updatedAt: new Date() }))
            .where(eq(budgetPolicies.id, policy.id));

          this.logger.info(
            { policyId: policy.id, oldAmount: policy.amountCents, newAmount },
            "Budget increased by 20%",
          );
        }
        break;
      }

      case "stop": {
        // Pause all agents
        await this.db
          .update(agents)
          .set(omitUndefined({ status: "paused", updatedAt: new Date() }))
          .where(
            and(
              eq(agents.companyId, incident.companyId),
              sql`${agents.status} != 'terminated'`,
            ),
          );

        this.logger.warn(
          { companyId: incident.companyId },
          "All agents paused (user request)",
        );
        break;
      }

      case "ignore": {
        // Do nothing
        break;
      }
    }

    // Resolve incident
    await this.db
      .update(budgetIncidents)
      .set(
        omitUndefined({
          status: "resolved",
          userResponse: response,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        }),
      )
      .where(eq(budgetIncidents.id, incidentId));
  }

  /**
   * Creates a budget incident (internal use).
   */
  private async createIncident(
    companyId: string,
    policyId: string,
    kind: string,
    currentSpendCents: number,
    limitCents: number,
  ): Promise<void> {
    // Prevent duplicate creation if an unresolved incident of the same kind already exists
    const existing = await this.db.query.budgetIncidents.findFirst({
      where: and(
        eq(budgetIncidents.companyId, companyId),
        eq(budgetIncidents.kind, kind),
        eq(budgetIncidents.status, "open"),
      ),
    });

    if (existing) {
      this.logger.debug(
        { companyId, kind },
        "Unresolved incident already exists — skipping duplicate creation",
      );
      return;
    }

    await this.db.insert(budgetIncidents).values(
      omitUndefined({
        companyId,
        policyId,
        kind,
        status: "open",
        currentSpendCents,
        limitCents,
      }),
    );

    this.logger.info(
      { companyId, kind, currentSpendCents, limitCents },
      "Budget incident created",
    );
  }
}
