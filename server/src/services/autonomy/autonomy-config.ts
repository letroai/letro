// server/src/services/autonomy/autonomy-config.ts
import { eq, and } from "drizzle-orm";
import {
  agents,
  companies,
  projects,
  autonomyLevels,
  agentCapabilities,
} from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";

/**
 * Autonomy level management service.
 *
 * Determines the effective autonomy level for an agent and
 * decides whether a specific action is autonomously allowed.
 *
 * Priority: agent-level override > project override > company default
 *
 * Autonomy levels:
 *   1 (Manual): all actions require user approval
 *   2 (Confirm): task creation is autonomous, hiring/firing requires approval
 *   3 (Auto): most actions autonomous, only budget changes require approval
 *   4 (Full Auto): all actions autonomous (notification only)
 */

type AutonomyAction =
  | "task_creation"
  | "hiring"
  | "firing"
  | "budget"
  | "explore"
  | "auto_merge"
  | "deploy";

interface AutonomyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  notifyUser: boolean;
  reason?: string;
}

/**
 * Per-action autonomy matrix.
 * key = action, value = { [level]: decision }
 */
const AUTONOMY_MATRIX: Record<AutonomyAction, Record<number, AutonomyDecision>> = {
  task_creation: {
    1: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    2: { allowed: true, requiresApproval: false, notifyUser: true },
    3: { allowed: true, requiresApproval: false, notifyUser: false },
    4: { allowed: true, requiresApproval: false, notifyUser: false },
  },
  hiring: {
    1: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    2: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    3: { allowed: true, requiresApproval: false, notifyUser: true },
    4: { allowed: true, requiresApproval: false, notifyUser: false },
  },
  firing: {
    1: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    2: { allowed: false, requiresApproval: true, notifyUser: true, reason: "Inactivity-only auto" },
    3: { allowed: true, requiresApproval: false, notifyUser: true },
    4: { allowed: true, requiresApproval: false, notifyUser: false },
  },
  budget: {
    1: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    2: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    3: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    4: { allowed: true, requiresApproval: false, notifyUser: true },
  },
  explore: {
    1: { allowed: false, requiresApproval: false, notifyUser: false, reason: "Exploration not allowed" },
    2: { allowed: false, requiresApproval: false, notifyUser: false, reason: "Exploration not allowed" },
    3: { allowed: true, requiresApproval: false, notifyUser: false },
    4: { allowed: true, requiresApproval: false, notifyUser: false },
  },
  auto_merge: {
    1: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    2: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    3: { allowed: true, requiresApproval: false, notifyUser: true },
    4: { allowed: true, requiresApproval: false, notifyUser: false },
  },
  deploy: {
    1: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    2: { allowed: false, requiresApproval: true, notifyUser: true, reason: "User approval required" },
    3: { allowed: true, requiresApproval: false, notifyUser: true },
    4: { allowed: true, requiresApproval: false, notifyUser: false },
  },
};

export class AutonomyConfigService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Determines the effective autonomy level for an agent.
   *
   * Priority: agent-level override > project override > company default
   *
   * @param agentId - Agent ID
   * @returns Effective autonomy level (1~4)
   */
  async getEffectiveLevel(agentId: string): Promise<number> {
    // 1. Query agent (autonomyLevel + companyId + projectId)
    const agent = await this.db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });
    if (!agent) return 4; // default

    // Use explicit agent-level setting (autonomyLevel in agents table)
    // However, project override takes precedence if set

    // 2. Check project override
    if (agent.projectId) {
      const project = await this.db.query.projects.findFirst({
        where: eq(projects.id, agent.projectId),
      });
      if (project?.autonomyLevelOverride !== null && project?.autonomyLevelOverride !== undefined) {
        return project.autonomyLevelOverride;
      }
    }

    // For leaders, check the project they lead
    if (agent.teamRole === "leader") {
      const leaderProject = await this.db.query.projects.findFirst({
        where: eq(projects.leaderAgentId, agentId),
      });
      if (leaderProject?.autonomyLevelOverride !== null && leaderProject?.autonomyLevelOverride !== undefined) {
        return leaderProject.autonomyLevelOverride;
      }
    }

    // 3. Use agent-level autonomy
    if (agent.autonomyLevel !== null && agent.autonomyLevel !== undefined) {
      return agent.autonomyLevel;
    }

    // 4. Company default
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, agent.companyId),
    });

    return company?.defaultAutonomyLevel ?? 4;
  }

  /**
   * Checks whether a specific action is autonomously allowed.
   *
   * @param agentId - Agent ID
   * @param actionType - Action type
   * @returns allowed / requiresApproval / notifyUser flags
   */
  async canAutoApprove(
    agentId: string,
    actionType: AutonomyAction,
  ): Promise<AutonomyDecision> {
    const level = await this.getEffectiveLevel(agentId);

    const decision = AUTONOMY_MATRIX[actionType]?.[level];
    if (!decision) {
      return {
        allowed: false,
        requiresApproval: false,
        notifyUser: false,
        reason: "Unknown action or autonomy level",
      };
    }

    this.logger.debug(
      { agentId, actionType, level, allowed: decision.allowed },
      "Autonomy decision",
    );

    return decision;
  }

  /**
   * Returns the list of capabilities granted to an agent.
   *
   * @param agentId - Agent ID
   * @returns List of granted capability keys
   */
  async getCapabilities(agentId: string): Promise<string[]> {
    const capabilities = await this.db
      .select({ capabilityKey: agentCapabilities.capabilityKey })
      .from(agentCapabilities)
      .where(
        and(
          eq(agentCapabilities.agentId, agentId),
          eq(agentCapabilities.granted, true),
        ),
      );

    return capabilities.map((c) => c.capabilityKey);
  }
}
