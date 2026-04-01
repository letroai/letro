// server/src/services/heartbeat.service.ts
import { eq, and, sql, inArray, isNull, lt } from "drizzle-orm";
import {
  agents,
  heartbeatRuns,
  agentWakeupRequests,
  issues,
  projects,
  projectGoals,
  goals,
  userIdeas,
} from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { callLLM } from "../lib/llm-client.js";
import { MAX_TASKS_PER_CYCLE, DEFAULT_ADAPTER_ID } from "../lib/defaults.js";

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

    // 5. Execute actual heartbeat logic based on agent role
    try {
      if (agent.teamRole === "leader") {
        await this.runLeaderHeartbeat(agent);
      }
      else {
        await this.runMemberHeartbeat(agent);
      }

      // 6. Mark run as completed
      await this.db
        .update(heartbeatRuns)
        .set(omitUndefined({
          status: "completed",
          finishedAt: new Date(),
        }))
        .where(eq(heartbeatRuns.id, run!.id));
    } catch (err) {
      this.logger.error({ runId: run!.id, agentId, err }, "Heartbeat execution failed");

      await this.db
        .update(heartbeatRuns)
        .set(omitUndefined({
          status: "failed",
          finishedAt: new Date(),
        }))
        .where(eq(heartbeatRuns.id, run!.id));
    }

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
   * Runs the full leader heartbeat loop:
   *
   * Step 1: Create tasks via Claude CLI (analyze goals, generate tasks)
   * Step 2: Hire team members based on idea's team_composition
   * Step 3: Assign unassigned tasks to idle team members
   * Step 4: Schedule next heartbeat (self-sustaining loop)
   */
  private async runLeaderHeartbeat(agent: { id: string; companyId: string }) {
    this.logger.info({ leaderId: agent.id }, "Running leader heartbeat");

    // 1. Find the leader's project
    const project = await this.db.query.projects.findFirst({
      where: eq(projects.leaderAgentId, agent.id),
    });
    if (!project) {
      this.logger.warn({ leaderId: agent.id }, "No project found for leader");
      return;
    }

    // 2. Find linked goals
    const goalLinks = await this.db
      .select()
      .from(projectGoals)
      .where(eq(projectGoals.projectId, project.id));

    let goalData: Array<{ title: string; description: string | null }> = [];
    if (goalLinks.length > 0) {
      const goalIds = goalLinks.map((l) => l.goalId);
      const projectGoalList = await this.db
        .select()
        .from(goals)
        .where(inArray(goals.id, goalIds));
      goalData = projectGoalList.map((g) => ({
        title: g.title,
        description: g.description,
      }));
    }

    // 3. Find the original idea's structured data (if available)
    let ideaStructured: Record<string, unknown> | null = null;
    if (goalData.length > 0) {
      const idea = await this.db.query.userIdeas.findFirst({
        where: eq(userIdeas.goalId, goalLinks[0]!.goalId),
      });
      if (idea?.structured) {
        ideaStructured = idea.structured as Record<string, unknown>;
      }
    }

    // ── Step 1: Create tasks via Claude CLI ──
    try {
      await this.createTasksViaClaude(agent, project, goalData, goalLinks, ideaStructured);
    } catch (err) {
      this.logger.error(
        { leaderId: agent.id, err },
        "Step 1 (task creation) failed, continuing to next steps",
      );
    }

    // ── Step 2: Hire team members based on idea's team_composition ──
    try {
      await this.hireTeamMembers(agent, project, ideaStructured);
    } catch (err) {
      this.logger.error(
        { leaderId: agent.id, err },
        "Step 2 (hiring) failed, continuing to next steps",
      );
    }

    // ── Step 3: Assign unassigned tasks to idle team members ──
    try {
      await this.assignTasksToMembers(agent, project);
    } catch (err) {
      this.logger.error(
        { leaderId: agent.id, err },
        "Step 3 (task assignment) failed, continuing to next steps",
      );
    }

    // ── Step 4: Schedule next heartbeat if work remains ──
    try {
      await this.scheduleNextHeartbeat(agent, project);
    } catch (err) {
      this.logger.error(
        { leaderId: agent.id, err },
        "Step 4 (scheduling) failed",
      );
    }
  }

  /**
   * Runs a member heartbeat: find assigned task, execute via Claude, update status.
   *
   * Members execute ONE task per heartbeat, then reschedule to pick up the next.
   * If no assigned task is found, the member goes idle and stops.
   */
  private async runMemberHeartbeat(agent: { id: string; companyId: string }) {
    this.logger.info({ memberId: agent.id }, "Running member heartbeat");

    // 1. Find the member's current assigned task (in_progress)
    const task = await this.db.query.issues.findFirst({
      where: and(
        eq(issues.assigneeAgentId, agent.id),
        eq(issues.status, "in_progress"),
      ),
    });

    if (!task) {
      this.logger.info({ memberId: agent.id }, "No assigned task found, member going idle");
      await this.db
        .update(agents)
        .set(omitUndefined({ status: "idle", updatedAt: new Date() }))
        .where(eq(agents.id, agent.id));
      return;
    }

    this.logger.info(
      { memberId: agent.id, taskId: task.id, taskTitle: task.title },
      `Member executing task: ${task.title}`,
    );

    // 2. Call Claude CLI to "execute" the task
    try {
      const response = await callLLM({
        system:
          "You are a software developer working on a task. Analyze the task and provide a brief summary of what you would do. Return a JSON object: { \"summary\": \"what was done\", \"completed\": true }",
        prompt: `Task: ${task.title}\nDescription: ${task.description ?? "No description provided"}\n\nProvide your execution summary as JSON.`,
      });

      // 3. Parse Claude's response
      let result: { summary: string; completed: boolean };
      try {
        result = JSON.parse(response.content);
      } catch {
        this.logger.warn(
          { memberId: agent.id, taskId: task.id, raw: response.content },
          "Failed to parse member LLM response as JSON, treating as completed",
        );
        result = { summary: response.content.slice(0, 500), completed: true };
      }

      // 4. If completed, mark task done and member idle
      if (result.completed) {
        const now = new Date();
        await this.db
          .update(issues)
          .set(omitUndefined({
            status: "done",
            checkedOutBy: null,
            checkedOutAt: null,
            updatedAt: now,
          }))
          .where(eq(issues.id, task.id));

        await this.db
          .update(agents)
          .set(omitUndefined({ status: "idle", updatedAt: now }))
          .where(eq(agents.id, agent.id));

        this.logger.info(
          {
            memberId: agent.id,
            taskId: task.id,
            taskTitle: task.title,
            summary: result.summary,
          },
          `Member completed task: ${task.title}`,
        );
      }
    } catch (err) {
      this.logger.error(
        { memberId: agent.id, taskId: task.id, err },
        "Member task execution via LLM failed, will retry on next heartbeat",
      );
    }

    // 5. Schedule next member heartbeat in 30 seconds (to pick up next task)
    setTimeout(() => {
      this.executeHeartbeat(agent.id).catch((err) =>
        this.logger.error({ err, agentId: agent.id }, "Scheduled member heartbeat failed"),
      );
    }, 30_000);
  }

  /**
   * Step 1: Creates tasks by calling Claude CLI with project context.
   */
  private async createTasksViaClaude(
    agent: { id: string; companyId: string },
    project: { id: string; name: string },
    goalData: Array<{ title: string; description: string | null }>,
    goalLinks: Array<{ goalId: string }>,
    ideaStructured: Record<string, unknown> | null,
  ) {
    // Find existing issues to avoid duplicates
    const existingIssues = await this.db
      .select({ title: issues.title, status: issues.status })
      .from(issues)
      .where(eq(issues.projectId, project.id));

    const existingTitles = existingIssues.map((i) => `- ${i.title} (${i.status})`).join("\n");

    // Build prompt and call Claude CLI
    const goalSummary = goalData
      .map((g) => `목표: ${g.title}\n설명: ${g.description ?? "없음"}`)
      .join("\n\n");

    const ideaContext = ideaStructured
      ? `\n\n아이디어 구조화 데이터:\n${JSON.stringify(ideaStructured, null, 2)}`
      : "";

    const existingContext = existingTitles
      ? `\n\n이미 존재하는 작업 목록 (중복 생성 금지):\n${existingTitles}`
      : "\n\n아직 생성된 작업이 없습니다.";

    const prompt = `프로젝트 "${project.name}"의 팀장으로서 다음 목표를 달성하기 위한 구체적인 작업을 생성하세요.

${goalSummary}${ideaContext}${existingContext}

규칙:
- 최대 ${MAX_TASKS_PER_CYCLE}개의 작업을 생성하세요
- 각 작업은 한 명의 팀원이 독립적으로 수행할 수 있어야 합니다
- 이미 존재하는 작업과 중복되지 않아야 합니다
- 작업은 구체적이고 실행 가능해야 합니다
- 우선순위는 "critical", "high", "medium", "low" 중 하나입니다

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  { "title": "작업 제목", "description": "구체적으로 무엇을 해야 하는지", "priority": "medium" }
]`;

    let tasksToCreate: Array<{ title: string; description: string; priority: string }> = [];

    const response = await callLLM({
      system: "당신은 소프트웨어 프로젝트 팀장입니다. 목표를 분석하여 구체적인 작업으로 분해합니다. JSON 배열로만 응답하세요.",
      prompt,
    });

    const parsed = JSON.parse(response.content);
    if (!Array.isArray(parsed)) {
      throw new Error("LLM response is not an array");
    }

    tasksToCreate = parsed
      .filter(
        (t: unknown): t is { title: string; description: string; priority: string } =>
          typeof t === "object" &&
          t !== null &&
          typeof (t as Record<string, unknown>).title === "string" &&
          typeof (t as Record<string, unknown>).description === "string",
      )
      .slice(0, MAX_TASKS_PER_CYCLE);

    this.logger.info(
      { leaderId: agent.id, taskCount: tasksToCreate.length },
      "Claude generated tasks for leader heartbeat",
    );

    // Insert generated tasks into the DB
    if (tasksToCreate.length === 0) {
      this.logger.info({ leaderId: agent.id }, "No new tasks to create");
      return;
    }

    const validPriorities = new Set(["critical", "high", "medium", "low"]);

    const linkedGoalId = goalLinks[0]?.goalId ?? null;

    const insertValues = tasksToCreate.map((task, idx) => ({
      companyId: agent.companyId,
      projectId: project.id,
      goalId: linkedGoalId,
      title: task.title,
      description: task.description,
      status: "todo" as const,
      priority: validPriorities.has(task.priority) ? task.priority : "medium",
      originKind: "decomposition",
      autoApproved: true,
      createdByAgentId: agent.id,
      sortOrder: idx,
    }));

    const created = await this.db
      .insert(issues)
      .values(insertValues)
      .returning({ id: issues.id, title: issues.title });

    this.logger.info(
      {
        leaderId: agent.id,
        projectId: project.id,
        createdTasks: created.map((c) => ({ id: c.id, title: c.title })),
      },
      `Leader heartbeat created ${created.length} tasks`,
    );
  }

  /**
   * Step 2: Hires team members based on the idea's team_composition.
   *
   * Only hires if no non-leader agents exist for the project yet.
   * Uses structured.team_composition.members from the original idea.
   */
  private async hireTeamMembers(
    agent: { id: string; companyId: string },
    project: { id: string },
    ideaStructured: Record<string, unknown> | null,
  ) {
    // Check if project already has team members (non-leader agents)
    const existingMembers = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(
        and(
          eq(agents.projectId, project.id),
          eq(agents.teamRole, "member"),
          sql`${agents.status} != 'terminated'`,
        ),
      );

    if (existingMembers.length > 0) {
      this.logger.info(
        { leaderId: agent.id, memberCount: existingMembers.length },
        "Team members already exist, skipping hiring",
      );
      return;
    }

    // Extract team_composition from idea structured data
    const teamComposition = ideaStructured?.team_composition as {
      members?: Array<{
        preset: string;
        member_type: string;
        display_name: string;
        reason?: string;
      }>;
    } | null;

    if (!teamComposition?.members || teamComposition.members.length === 0) {
      this.logger.info(
        { leaderId: agent.id },
        "No team_composition in idea structured data, skipping hiring",
      );
      return;
    }

    // Hire each member from the team_composition
    for (const member of teamComposition.members) {
      const [newAgent] = await this.db
        .insert(agents)
        .values(
          omitUndefined({
            companyId: agent.companyId,
            projectId: project.id,
            name: member.display_name,
            teamRole: "member",
            memberType: member.member_type,
            status: "idle",
            adapterId: DEFAULT_ADAPTER_ID,
            reportsTo: agent.id,
            hiredByAgentId: agent.id,
            specialization: [member.preset],
            idleBehavior: "wait",
            maxConcurrentTasks: 1,
          }),
        )
        .returning();

      this.logger.info(
        {
          leaderId: agent.id,
          memberId: newAgent!.id,
          memberName: member.display_name,
          preset: member.preset,
        },
        `Hired team member: ${member.display_name}`,
      );
    }

    this.logger.info(
      { leaderId: agent.id, hiredCount: teamComposition.members.length },
      `Hired ${teamComposition.members.length} team members from idea composition`,
    );
  }

  /**
   * Step 3: Assigns unassigned tasks to idle team members.
   *
   * Uses first-available matching: iterates unassigned tasks and assigns
   * each to the next available idle member.
   */
  private async assignTasksToMembers(
    agent: { id: string; companyId: string },
    project: { id: string },
  ) {
    // Query unassigned tasks (status = 'todo', no assignee)
    const unassignedTasks = await this.db
      .select()
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          isNull(issues.assigneeAgentId),
          eq(issues.status, "todo"),
        ),
      );

    if (unassignedTasks.length === 0) {
      this.logger.info({ leaderId: agent.id }, "No unassigned tasks to assign");
      return;
    }

    // Query idle team members
    const idleMembers = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.projectId, project.id),
          eq(agents.teamRole, "member"),
          eq(agents.status, "idle"),
        ),
      );

    if (idleMembers.length === 0) {
      this.logger.info({ leaderId: agent.id }, "No idle team members available for assignment");
      return;
    }

    // Assign tasks to members (round-robin / first-available)
    let memberIdx = 0;
    let assignedCount = 0;
    const assignedMemberIds: string[] = [];

    for (const task of unassignedTasks) {
      if (memberIdx >= idleMembers.length) break;

      const member = idleMembers[memberIdx]!;
      const now = new Date();

      // Update issue: assign to member, mark as in_progress, check out
      await this.db
        .update(issues)
        .set(omitUndefined({
          assigneeAgentId: member.id,
          status: "in_progress",
          checkedOutBy: member.id,
          checkedOutAt: now,
          updatedAt: now,
        }))
        .where(eq(issues.id, task.id));

      // Update agent: mark as working
      await this.db
        .update(agents)
        .set(omitUndefined({
          status: "working",
          updatedAt: now,
        }))
        .where(eq(agents.id, member.id));

      this.logger.info(
        {
          leaderId: agent.id,
          memberId: member.id,
          memberName: member.name,
          taskId: task.id,
          taskTitle: task.title,
        },
        `Assigned task '${task.title}' to ${member.name}`,
      );

      assignedMemberIds.push(member.id);
      assignedCount++;
      memberIdx++;
    }

    this.logger.info(
      { leaderId: agent.id, assignedCount, totalUnassigned: unassignedTasks.length },
      `Assigned ${assignedCount} tasks to team members`,
    );

    // Trigger member heartbeats so they actually start working
    for (const memberId of assignedMemberIds) {
      setTimeout(() => {
        this.executeHeartbeat(memberId).catch((err) =>
          this.logger.error({ err, agentId: memberId }, "Member heartbeat trigger failed"),
        );
      }, 3000);
    }
  }

  /**
   * Step 4: Schedules the next heartbeat if work remains.
   *
   * The loop stops when there are no more unassigned tasks AND no in-progress tasks.
   * Otherwise, schedules the next heartbeat in 60 seconds (MVP demo speed).
   */
  private async scheduleNextHeartbeat(
    agent: { id: string; companyId: string },
    project: { id: string },
  ) {
    // 1. Check for completed tasks (recently done)
    const completedTasks = await this.db
      .select({ id: issues.id, title: issues.title })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          eq(issues.status, "done"),
        ),
      );

    if (completedTasks.length > 0) {
      this.logger.info(
        { leaderId: agent.id, completedCount: completedTasks.length },
        `${completedTasks.length} tasks completed so far`,
      );
    }

    // 2. Check for stuck members (in_progress for > 10 minutes without progress)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckTasks = await this.db
      .select({ id: issues.id, title: issues.title, assigneeAgentId: issues.assigneeAgentId })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          eq(issues.status, "in_progress"),
          lt(issues.checkedOutAt, tenMinutesAgo),
        ),
      );

    if (stuckTasks.length > 0) {
      this.logger.warn(
        {
          leaderId: agent.id,
          stuckTasks: stuckTasks.map((t) => ({ id: t.id, title: t.title, assignee: t.assigneeAgentId })),
        },
        `${stuckTasks.length} tasks appear stuck (in_progress > 10 min)`,
      );
    }

    // 3. Assign any remaining unassigned todo tasks to idle members
    // (already handled by assignTasksToMembers in the main loop, but re-check here
    //  in case new idle members appeared since the last assignment)
    const unassignedTodo = await this.db
      .select({ id: issues.id })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          isNull(issues.assigneeAgentId),
          eq(issues.status, "todo"),
        ),
      );

    if (unassignedTodo.length > 0) {
      // Re-run assignment for any newly idle members
      try {
        await this.assignTasksToMembers(agent, project);
      } catch (err) {
        this.logger.error(
          { leaderId: agent.id, err },
          "Re-assignment in scheduleNextHeartbeat failed",
        );
      }
    }

    // 4. Check if there are any remaining tasks (unassigned or in-progress)
    const remainingTasks = await this.db
      .select({ id: issues.id })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          sql`${issues.status} IN ('todo', 'in_progress')`,
        ),
      );

    if (remainingTasks.length === 0) {
      this.logger.info(
        { leaderId: agent.id, projectId: project.id },
        "All tasks completed, heartbeat loop stopping",
      );
      return;
    }

    this.logger.info(
      { leaderId: agent.id, remainingTasks: remainingTasks.length },
      "Scheduling next heartbeat in 60s",
    );

    setTimeout(() => {
      this.executeHeartbeat(agent.id).catch((err) =>
        this.logger.error({ err, agentId: agent.id }, "Scheduled heartbeat failed"),
      );
    }, 60_000);
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
