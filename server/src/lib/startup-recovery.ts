// server/src/lib/startup-recovery.ts
// Recovers from unclean server shutdown:
// - Resets "working" agents to "idle"
// - Resets "in_progress" tasks (with no running process) to "todo"
// - Re-triggers leader heartbeats for active (non-paused) projects

import { eq, sql } from "drizzle-orm";
import { agents, issues, projects } from "@letro/db/schema";
import type { Database } from "@letro/db/client";
import type { Logger } from "pino";

interface Services {
  heartbeat: { executeHeartbeat(agentId: string): Promise<unknown> };
  project: { getById(id: string): Promise<unknown> };
}

export async function recoverStuckAgents(
  db: Database,
  services: Services,
  logger: Logger,
): Promise<void> {
  const now = new Date();

  // 1. Reset all "working" agents to "idle"
  const stuckAgents = await db
    .select({ id: agents.id, name: agents.name, teamRole: agents.teamRole })
    .from(agents)
    .where(eq(agents.status, "working"));

  if (stuckAgents.length > 0) {
    await db
      .update(agents)
      .set({ status: "idle", updatedAt: now })
      .where(eq(agents.status, "working"));

    logger.warn(
      { count: stuckAgents.length, agents: stuckAgents.map((a) => a.name) },
      `Recovered ${stuckAgents.length} stuck agents (working → idle)`,
    );
  }

  // 2. Reset "in_progress" tasks to "todo" and clear assignees
  const stuckTasks = await db
    .select({ id: issues.id, title: issues.title })
    .from(issues)
    .where(eq(issues.status, "in_progress"));

  if (stuckTasks.length > 0) {
    await db
      .update(issues)
      .set({
        status: "todo",
        assigneeAgentId: null,
        checkedOutBy: null,
        checkedOutAt: null,
        updatedAt: now,
      })
      .where(eq(issues.status, "in_progress"));

    logger.warn(
      { count: stuckTasks.length, tasks: stuckTasks.map((t) => t.title) },
      `Recovered ${stuckTasks.length} stuck tasks (in_progress → todo)`,
    );
  }

  // 3. Re-trigger leader heartbeats for active projects
  const activeProjects = await db
    .select({ id: projects.id, leaderAgentId: projects.leaderAgentId, settings: projects.settings })
    .from(projects);

  let leadersTriggered = 0;
  for (const project of activeProjects) {
    // Skip paused projects
    const settings = project.settings as Record<string, unknown> | null;
    if (settings?.paused) continue;

    if (project.leaderAgentId) {
      // Check leader is not terminated or paused
      const leader = await db.query.agents.findFirst({
        where: eq(agents.id, project.leaderAgentId),
      });
      if (leader && leader.status !== "terminated" && leader.status !== "paused") {
        setTimeout(() => {
          services.heartbeat.executeHeartbeat(project.leaderAgentId!).catch((err: unknown) =>
            logger.error({ err, leaderId: project.leaderAgentId }, "Recovery leader heartbeat failed"),
          );
        }, 3000 + leadersTriggered * 2000); // Stagger to avoid thundering herd
        leadersTriggered++;
      }
    }
  }

  if (leadersTriggered > 0) {
    logger.info(
      { leadersTriggered },
      `Scheduled ${leadersTriggered} leader heartbeats for recovery (staggered)`,
    );
  }

  if (stuckAgents.length === 0 && stuckTasks.length === 0 && leadersTriggered === 0) {
    logger.info("Startup recovery: no stuck agents or tasks found");
  }
}
