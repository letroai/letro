// server/src/services/project.service.ts
import { createHash, randomBytes } from "crypto";
import { eq, and, ne } from "drizzle-orm";
import { projects, projectGoals, agents, agentApiKeys } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { DEFAULT_ADAPTER_ID } from "../lib/defaults.js";

/**
 * Project CRUD and team management service.
 *
 * Project = Team (1:1 relationship).
 * Leader agent and API key are auto-created on project creation.
 *
 * Displayed as "project" in the UI.
 */
export class ProjectService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Lists projects for a company.
   */
  async list(companyId: string) {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId));
  }

  /**
   * Retrieves a project by ID.
   */
  async getById(id: string) {
    const result = await this.db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
    return result ?? null;
  }

  /**
   * Creates a new project.
   *
   * Handles the following atomically in a transaction:
   * 1. Create leader agent (management only, no direct execution)
   * 2. Create API key for leader
   * 3. Create project (linked to leaderAgentId)
   * 4. Link goals (project_goals N:M)
   *
   * @param companyId - Company ID
   * @param input - Project info
   */
  async create(
    companyId: string,
    input: {
      name: string;
      description?: string;
      repoUrl?: string;
      autonomyLevelOverride?: number;
      autoTaskGeneration?: boolean;
      settings?: Record<string, unknown>;
      goalIds?: string[];
    },
  ) {
    this.logger.info(
      { companyId, name: input.name },
      "Creating project (transaction start)",
    );

    return this.db.transaction(async (tx) => {
      // 1. Create leader agent
      const [leader] = await tx
        .insert(agents)
        .values({
          companyId,
          name: `${input.name} 팀장`,
          teamRole: "leader",
          status: "idle",
          adapterId: DEFAULT_ADAPTER_ID,
          autonomyLevel: input.autonomyLevelOverride ?? 4,
          idleBehavior: "explore",
          maxConcurrentTasks: 0, // Leader does not execute tasks directly
        })
        .returning();

      // 2. Create API key for leader
      const rawBytes = randomBytes(48);
      const rawKey = `letro_${rawBytes.toString("hex")}`;
      const keyPrefix = rawKey.slice(0, 12);
      const keyHash = createHash("sha256").update(rawKey).digest("hex");

      await tx.insert(agentApiKeys).values({
        companyId,
        agentId: leader!.id,
        keyHash,
        keyPrefix,
        label: "auto-generated",
      });

      // 3. Create project
      const [project] = await tx
        .insert(projects)
        .values(
          omitUndefined({
            companyId,
            name: input.name,
            description: input.description,
            repoUrl: input.repoUrl,
            leaderAgentId: leader!.id,
            autonomyLevelOverride: input.autonomyLevelOverride,
            autoTaskGeneration: input.autoTaskGeneration ?? true,
            settings: input.settings,
          }),
        )
        .returning();

      // 4. Link agent to projectId
      await tx
        .update(agents)
        .set({ projectId: project!.id })
        .where(eq(agents.id, leader!.id));

      // 5. Link goals (project_goals N:M)
      if (input.goalIds && input.goalIds.length > 0) {
        for (const goalId of input.goalIds) {
          await tx.insert(projectGoals).values({
            projectId: project!.id,
            goalId,
          });
        }
      }

      this.logger.info(
        { projectId: project!.id, leaderAgentId: leader!.id },
        "Project created (with leader + API key + goal links)",
      );

      return { project: project!, leader: leader!, leaderApiKey: rawKey };
    });
  }

  /**
   * Partially updates project info.
   */
  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      repoUrl: string;
      autonomyLevelOverride: number;
      autoTaskGeneration: boolean;
      settings: Record<string, unknown>;
    }>,
  ) {
    const [updated] = await this.db
      .update(projects)
      .set(omitUndefined({ ...input, updatedAt: new Date() }))
      .where(eq(projects.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Deletes a project.
   */
  async delete(id: string) {
    this.logger.warn({ projectId: id }, "Deleting project");

    const [deleted] = await this.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    return deleted ?? null;
  }

  /**
   * Retrieves the team (leader + members) for a project.
   *
   * Team structure:
   * - Leader: agent linked via project's leaderAgentId
   * - Members: reportsTo = leader.id, teamRole='member', status != 'terminated'
   *
   * @param projectId - Project ID
   * @returns { leader, members }
   */
  async getTeam(projectId: string) {
    const project = await this.getById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Query leader
    const leader = await this.db.query.agents.findFirst({
      where: eq(agents.id, project.leaderAgentId),
    });

    if (!leader) {
      throw new Error(`Leader agent not found: ${project.leaderAgentId}`);
    }

    // Query members (reportsTo = leader.id, teamRole='member', non-terminated agents)
    const members = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.reportsTo, leader.id),
          eq(agents.teamRole, "member"),
          ne(agents.status, "terminated"),
        ),
      );

    return { leader, members };
  }
}
