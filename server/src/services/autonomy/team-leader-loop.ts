// server/src/services/autonomy/team-leader-loop.ts
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  agents,
  goals,
  issues,
  projects,
  projectGoals,
  heartbeatRuns,
} from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { MIN_HEARTBEAT_INTERVAL_MS } from "../../lib/defaults.js";

/**
 * Team status assessment result.
 */
interface TeamAssessment {
  members: Array<{
    agentId: string;
    name: string;
    memberType: string | null;
    status: string;
    activeTaskCount: number;
    isIdle: boolean;
  }>;
  unassignedTaskCount: number;
  totalMembers: number;
  idleMemberCount: number;
  allGoalsCompleted: boolean;
  overallProgress: number;
}

/**
 * Leader heartbeat loop result.
 */
interface LeaderLoopResult {
  tasksCreated: number;
  tasksAssigned: number;
  agentsHired: number;
  agentsFired: number;
  nextHeartbeatMs: number;
}

/**
 * Leader decision loop (Letro's core).
 *
 * Main loop executed on every leader agent heartbeat.
 * Assesses project goals/current status, handles task creation/assignment,
 * and decides on member hiring/firing.
 *
 * The leader does not execute directly; it focuses only on management.
 *
 * Currently in MVP, implemented as rule-based stubs instead of LLM-based decisions.
 * TODO: Replace with assessTeam → decideNextAction → execution pipeline when LLM is integrated
 */
export class TeamLeaderLoop {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Executes the leader heartbeat loop (core entry point).
   *
   * 1. Assess team status (assessTeam)
   * 2. Decide next action (decideNextAction) — stub
   * 3. Return result
   *
   * @param leaderId - Leader agent ID
   * @returns Loop result (created/assigned/hired/fired counts, next heartbeat time)
   */
  async executeLeaderHeartbeat(leaderId: string): Promise<LeaderLoopResult> {
    this.logger.info({ leaderId }, "Leader heartbeat loop started");

    const result: LeaderLoopResult = {
      tasksCreated: 0,
      tasksAssigned: 0,
      agentsHired: 0,
      agentsFired: 0,
      nextHeartbeatMs: MIN_HEARTBEAT_INTERVAL_MS,
    };

    // Step 1: Find project managed by leader
    const project = await this.db.query.projects.findFirst({
      where: eq(projects.leaderAgentId, leaderId),
    });
    if (!project) {
      this.logger.warn({ leaderId }, "No project managed by this leader");
      return result;
    }

    // Step 2: Assess team status
    const teamStatus = await this.assessTeam(leaderId);

    this.logger.info(
      {
        leaderId,
        projectId: project.id,
        totalMembers: teamStatus.totalMembers,
        idleMembers: teamStatus.idleMemberCount,
        unassignedTasks: teamStatus.unassignedTaskCount,
        overallProgress: teamStatus.overallProgress,
        allGoalsCompleted: teamStatus.allGoalsCompleted,
      },
      "Team status assessment completed",
    );

    // Step 3: Decide next action (LLM stub)
    const decision = await this.decideNextAction(leaderId, teamStatus);

    this.logger.info(
      { leaderId, decision },
      "Leader decision completed (stub)",
    );

    // Step 4: Determine next heartbeat schedule
    result.nextHeartbeatMs = this.calculateNextHeartbeat(teamStatus);

    this.logger.info(
      { leaderId, result },
      "Leader heartbeat loop completed",
    );

    return result;
  }

  /**
   * Assesses team status.
   *
   * Collects member list, each member's current task status, unassigned tasks,
   * goal progress, etc.
   *
   * @param leaderId - Leader agent ID
   * @returns Team status assessment result
   */
  async assessTeam(leaderId: string): Promise<TeamAssessment> {
    // 1. Query member list
    const members = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.reportsTo, leaderId),
          eq(agents.teamRole, "member"),
          sql`${agents.status} != 'terminated'`,
        ),
      );

    // 2. Calculate active task count for each member
    const memberStatuses = await Promise.all(
      members.map(async (m) => {
        const activeIssues = await this.db
          .select()
          .from(issues)
          .where(
            and(
              eq(issues.assigneeAgentId, m.id),
              eq(issues.status, "in_progress"),
            ),
          );
        return {
          agentId: m.id,
          name: m.name,
          memberType: m.memberType,
          status: m.status,
          activeTaskCount: activeIssues.length,
          isIdle: activeIssues.length === 0 && m.status === "idle",
        };
      }),
    );

    // 3. Count unassigned tasks in leader's project
    const project = await this.db.query.projects.findFirst({
      where: eq(projects.leaderAgentId, leaderId),
    });

    let unassignedTaskCount = 0;
    if (project) {
      const unassigned = await this.db
        .select()
        .from(issues)
        .where(
          and(
            eq(issues.projectId, project.id),
            sql`${issues.assigneeAgentId} IS NULL`,
            sql`${issues.status} IN ('backlog', 'todo')`,
          ),
        );
      unassignedTaskCount = unassigned.length;
    }

    // 4. Goal progress (goals linked to project)
    let allGoalsCompleted = true;
    let overallProgress = 0;

    if (project) {
      const goalLinks = await this.db
        .select()
        .from(projectGoals)
        .where(eq(projectGoals.projectId, project.id));

      if (goalLinks.length > 0) {
        const goalIds = goalLinks.map((l) => l.goalId);
        const projectGoalList = await this.db
          .select()
          .from(goals)
          .where(inArray(goals.id, goalIds));

        let totalProgress = 0;
        for (const goal of projectGoalList) {
          if (goal.status !== "completed") {
            allGoalsCompleted = false;
          }
          totalProgress += goal.progressPercent ?? 0;
        }
        overallProgress = projectGoalList.length > 0
          ? Math.round(totalProgress / projectGoalList.length)
          : 0;
      } else {
        allGoalsCompleted = false;
      }
    }

    const idleMemberCount = memberStatuses.filter((m) => m.isIdle).length;

    return {
      members: memberStatuses,
      unassignedTaskCount,
      totalMembers: members.length,
      idleMemberCount,
      allGoalsCompleted,
      overallProgress,
    };
  }

  /**
   * Decides the next action.
   *
   * TODO: When LLM is integrated, this method will call the LLM to
   * make decisions based on team status.
   *
   * Currently in MVP, returns simple rule-based decisions.
   *
   * @param leaderId - Leader agent ID
   * @param teamStatus - Team status assessment result
   * @returns Decision description (string)
   */
  async decideNextAction(
    leaderId: string,
    teamStatus: TeamAssessment,
  ): Promise<string> {
    // TODO: Replace with LLM call
    // const decision = await callLLM({
    //   system: "Leader role. Analyze team status and decide next action.",
    //   user: JSON.stringify(teamStatus),
    // });

    if (teamStatus.allGoalsCompleted) {
      return "All goals completed — standby";
    }

    if (teamStatus.unassignedTaskCount > 0 && teamStatus.idleMemberCount > 0) {
      return "Unassigned tasks and idle members — task assignment needed";
    }

    if (teamStatus.unassignedTaskCount > teamStatus.totalMembers * 2) {
      return "Too many unassigned tasks — consider hiring additional members";
    }

    if (teamStatus.idleMemberCount > 0 && teamStatus.unassignedTaskCount === 0) {
      return "Idle members with no tasks — consider creating new tasks or firing";
    }

    return "Normal operation — continue monitoring";
  }

  /**
   * Calculates wait time until next heartbeat.
   *
   * - When goals achieved: 1 hour
   * - >5 unassigned tasks: 10 min (busy)
   * - Idle members present: 10 min
   * - Normal: 20 min
   */
  private calculateNextHeartbeat(assessment: TeamAssessment): number {
    if (assessment.allGoalsCompleted) {
      return 60 * 60 * 1000; // 1 hour
    }
    if (assessment.unassignedTaskCount > 5) {
      return MIN_HEARTBEAT_INTERVAL_MS; // 10 min
    }
    if (assessment.idleMemberCount > 0) {
      return MIN_HEARTBEAT_INTERVAL_MS; // 10 min
    }
    return 20 * 60 * 1000; // 20 min
  }
}
