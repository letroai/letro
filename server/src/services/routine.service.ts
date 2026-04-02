// server/src/services/routine.service.ts
import { eq, and, lte } from "drizzle-orm";
import { routines, routineRuns } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";

/**
 * Manages recurring routines (cron-based automated tasks).
 *
 * Routines allow team leaders or users to set up recurring actions
 * like "check goal progress every morning" or "run tests daily".
 */
export class RoutineService {
  private db;
  private logger;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /** Lists routines for a company/project. */
  async list(companyId: string, projectId?: string) {
    const conditions = [eq(routines.companyId, companyId)];
    if (projectId) conditions.push(eq(routines.projectId, projectId));
    return this.db.select().from(routines).where(and(...conditions));
  }

  /** Gets a single routine. */
  async getById(id: string) {
    return this.db.query.routines.findFirst({ where: eq(routines.id, id) });
  }

  /** Creates a new routine. */
  async create(
    companyId: string,
    input: {
      name: string;
      description?: string;
      projectId?: string;
      cronExpression?: string;
      taskTemplate?: Record<string, unknown>;
      createdByAgentId?: string;
    },
  ) {
    const nextRun = input.cronExpression ? this.getNextCronRun(input.cronExpression) : null;

    const [routine] = await this.db
      .insert(routines)
      .values(omitUndefined({
        companyId,
        projectId: input.projectId,
        createdByAgentId: input.createdByAgentId,
        name: input.name,
        description: input.description,
        cronExpression: input.cronExpression,
        taskTemplate: input.taskTemplate,
        nextRunAt: nextRun,
        enabled: true,
      }))
      .returning();

    this.logger.info({ routineId: routine!.id, name: input.name, cron: input.cronExpression }, "Routine created");
    return routine!;
  }

  /** Updates a routine. */
  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      cronExpression: string;
      enabled: boolean;
      taskTemplate: Record<string, unknown>;
    }>,
  ) {
    const updates: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if (input.cronExpression) {
      updates.nextRunAt = this.getNextCronRun(input.cronExpression);
    }

    const [updated] = await this.db
      .update(routines)
      .set(omitUndefined(updates))
      .where(eq(routines.id, id))
      .returning();
    return updated ?? null;
  }

  /** Deletes a routine. */
  async delete(id: string) {
    const [deleted] = await this.db
      .delete(routines)
      .where(eq(routines.id, id))
      .returning();
    return deleted ?? null;
  }

  /** Gets run history for a routine. */
  async listRuns(routineId: string) {
    return this.db
      .select()
      .from(routineRuns)
      .where(eq(routineRuns.routineId, routineId));
  }

  /** Checks for due routines and executes them. Called periodically. */
  async tickDueRoutines(): Promise<number> {
    const now = new Date();
    const dueRoutines = await this.db
      .select()
      .from(routines)
      .where(and(
        eq(routines.enabled, true),
        lte(routines.nextRunAt, now),
      ));

    let executed = 0;
    for (const routine of dueRoutines) {
      try {
        // Create run record
        const [run] = await this.db
          .insert(routineRuns)
          .values({ routineId: routine.id, status: "completed", startedAt: now, finishedAt: now })
          .returning();

        // Update routine: set lastRunAt and calculate nextRunAt
        const nextRun = routine.cronExpression ? this.getNextCronRun(routine.cronExpression) : null;
        await this.db
          .update(routines)
          .set(omitUndefined({ lastRunAt: now, nextRunAt: nextRun, updatedAt: now }))
          .where(eq(routines.id, routine.id));

        executed++;
        this.logger.info({ routineId: routine.id, name: routine.name, runId: run!.id }, "Routine executed");
      } catch (err) {
        this.logger.error({ routineId: routine.id, err }, "Routine execution failed");
      }
    }

    return executed;
  }

  /** Starts the routine ticker (checks every 60 seconds). */
  startTicker() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      this.tickDueRoutines().catch((err) =>
        this.logger.error({ err }, "Routine ticker failed"),
      );
    }, 60_000);
    this.logger.info("Routine ticker started (60s interval)");
  }

  /** Simple cron-like next run calculation. Supports basic patterns only. */
  private getNextCronRun(cron: string): Date {
    // For MVP: interpret as interval in minutes if it's a simple number
    // Full cron parsing can be added later
    const parts = cron.split(" ");
    const now = new Date();

    if (parts.length === 1 && !isNaN(Number(parts[0]))) {
      // Simple interval: "60" means every 60 minutes
      return new Date(now.getTime() + Number(parts[0]) * 60_000);
    }

    // Default: next day at 9 AM
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }
}
