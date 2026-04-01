// server/src/services/heartbeat.service.ts
import { eq, and, sql } from "drizzle-orm";
import {
  agents,
  heartbeatRuns,
  agentWakeupRequests,
} from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";

/**
 * Heartbeat service — Letro's core execution engine.
 *
 * Manages agent heartbeat runs:
 * - wakeup: Wake up agent (add wakeup request to queue)
 * - executeHeartbeat: Create and execute run
 * - getRunStatus: Query run status
 *
 * Actual adapter invocation (Claude CLI, process, etc.) is TODO.
 * MVP focuses on run record creation/status management.
 */
export class HeartbeatService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Executes an agent's heartbeat.
   *
   * 1. Create heartbeat_runs record (status='queued')
   * 2. (TODO) Actual adapter invocation
   * 3. Update run status to 'completed' or 'failed'
   *
   * @param agentId - Agent ID
   * @param issueId - Related issue ID (optional)
   * @returns Created heartbeat run record
   */
  async executeHeartbeat(agentId: string, issueId?: string) {
    this.logger.info({ agentId, issueId }, "Heartbeat execution started");

    // 1. Query agent
    const agent = await this.db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    if (agent.status === "terminated") {
      throw new Error(`Agent is terminated: ${agentId}`);
    }

    // 2. Create heartbeat_run record
    const [run] = await this.db
      .insert(heartbeatRuns)
      .values(
        omitUndefined({
          companyId: agent.companyId,
          agentId,
          issueId,
          status: "queued",
        }),
      )
      .returning();

    this.logger.info(
      { runId: run!.id, agentId, status: "queued" },
      "Heartbeat run created",
    );

    // 3. Transition run status to running
    await this.db
      .update(heartbeatRuns)
      .set(omitUndefined({
        status: "running",
        startedAt: new Date(),
      }))
      .where(eq(heartbeatRuns.id, run!.id));

    // 4. Transition agent status to working
    await this.db
      .update(agents)
      .set(omitUndefined({
        status: "working",
        updatedAt: new Date(),
      }))
      .where(eq(agents.id, agentId));

    // 5. TODO: Actual adapter invocation
    // if (agent.teamRole === "leader") {
    //   await teamLeaderLoop.executeLeaderHeartbeat(agentId);
    // } else {
    //   const adapter = getAdapter(agent.adapterId);
    //   const handle = await adapter.start({ ... });
    //   const result = await handle.wait();
    // }

    // 6. MVP: Immediately complete as stub
    await this.db
      .update(heartbeatRuns)
      .set(omitUndefined({
        status: "completed",
        finishedAt: new Date(),
      }))
      .where(eq(heartbeatRuns.id, run!.id));

    // 7. Revert agent status to idle
    await this.db
      .update(agents)
      .set(omitUndefined({
        status: "idle",
        updatedAt: new Date(),
      }))
      .where(eq(agents.id, agentId));

    this.logger.info(
      { runId: run!.id, agentId, status: "completed" },
      "Heartbeat run completed",
    );

    // Return final run status
    const completedRun = await this.db.query.heartbeatRuns.findFirst({
      where: eq(heartbeatRuns.id, run!.id),
    });

    return completedRun!;
  }

  /**
   * Wakes up an agent (adds wakeup request to queue).
   *
   * Adds a record to the wakeup_requests queue,
   * and triggers the agent's heartbeat.
   *
   * @param agentId - Agent ID to wake up
   * @param context - Wakeup context (source, issueId, etc.)
   */
  async wakeup(
    agentId: string,
    context?: { source?: string; issueId?: string },
  ): Promise<void> {
    this.logger.info({ agentId, context }, "Agent wakeup request");

    // 1. Check agent status
    const agent = await this.db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    if (agent.status === "terminated") return;
    if (agent.status === "paused") return;

    // 2. Create wakeup request record
    await this.db
      .insert(agentWakeupRequests)
      .values(
        omitUndefined({
          companyId: agent.companyId,
          agentId,
          reason: context?.source ?? "user",
          requestedAt: new Date(),
        }),
      );

    this.logger.info(
      { agentId, source: context?.source ?? "user" },
      "Wakeup request created",
    );

    // 3. Trigger heartbeat (async)
    // TODO: In production, handle asynchronously via queue/scheduler
    // Currently in MVP, execute synchronously
    try {
      await this.executeHeartbeat(agentId, context?.issueId);
    } catch (err) {
      this.logger.error(
        { agentId, err },
        "Heartbeat execution failed after wakeup",
      );
    }
  }

  /**
   * Retrieves the status of a heartbeat run.
   *
   * @param runId - Heartbeat run ID
   * @returns Run record or null
   */
  async getRunStatus(runId: string) {
    const run = await this.db.query.heartbeatRuns.findFirst({
      where: eq(heartbeatRuns.id, runId),
    });
    return run ?? null;
  }
}
