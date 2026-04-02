// server/src/services/heartbeat.service.ts
import { eq, and, sql, inArray, isNull, lt } from "drizzle-orm";
import {
  agents,
  heartbeatRuns,
  agentWakeupRequests,
  issues,
  issueComments,
  projects,
  projectGoals,
  goals,
  userIdeas,
} from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import type { WorkspaceService } from "./workspace.service.js";
import type { SecretService } from "./secret.service.js";
import type { AutonomyConfigService } from "./autonomy/autonomy-config.js";
import type { ApprovalService } from "./approval.service.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { callLLM, callLLMStreaming } from "../lib/llm-client.js";
import { DEFAULT_ADAPTER_ID } from "../lib/defaults.js";
import { publishLiveEvent } from "../ws/websocket-server.js";
import { appendTaskOutput, clearTaskOutput } from "../lib/task-output-store.js";
import { executionWorkspaces } from "@letro/db/schema";

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
  private config;
  private workspaceService?: WorkspaceService;
  private secretService?: SecretService;
  private autonomyConfig?: AutonomyConfigService;
  private approvalService?: ApprovalService;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
    this.config = deps.config;
  }

  setWorkspaceService(ws: WorkspaceService) {
    this.workspaceService = ws;
  }

  setSecretService(ss: SecretService) {
    this.secretService = ss;
  }

  setAutonomyConfig(ac: AutonomyConfigService) {
    this.autonomyConfig = ac;
  }

  setApprovalService(as_: ApprovalService) {
    this.approvalService = as_;
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
    if (agent.status === "terminated" || agent.status === "paused") {
      this.logger.info({ agentId, status: agent.status }, "Agent is not active, skipping heartbeat");
      return null;
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
   * Step 0: Promote backlog tasks whose dependencies are now met
   * Step 1: Create tasks via Claude CLI (only if pending tasks are below threshold)
   * Step 2: Hire team members based on idea's team_composition (+ dynamic scaling)
   * Step 3: Assign unassigned tasks to idle team members
   * Step 4: Schedule next heartbeat (self-sustaining loop)
   */
  private async runLeaderHeartbeat(agent: { id: string; companyId: string; name: string; systemPrompt: string | null }) {
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

    // ── Step 0: Promote backlog tasks whose dependencies are now met ──
    try {
      await this.promoteUnblockedTasks(project);
    } catch (err) {
      this.logger.error(
        { leaderId: agent.id, err },
        "Step 0 (backlog promotion) failed, continuing to next steps",
      );
    }

    // ── Step 1: Smart task creation gate ──
    // Only create tasks if pending count is below threshold
    try {
      const existingIssues = await this.db
        .select({ title: issues.title, status: issues.status })
        .from(issues)
        .where(eq(issues.projectId, project.id));

      const taskCounts = {
        todo: existingIssues.filter((i) => i.status === "todo").length,
        inProgress: existingIssues.filter((i) => i.status === "in_progress").length,
        backlog: existingIssues.filter((i) => i.status === "backlog").length,
        done: existingIssues.filter((i) => i.status === "done").length,
      };
      const pendingTasks = taskCounts.todo + taskCounts.inProgress;

      // Count current active team members
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

      const memberCount = existingMembers.length;
      const maxPendingTasks = Math.max(memberCount + 1, 3);

      if (pendingTasks < maxPendingTasks) {
        // Check autonomy: is task creation allowed?
        const taskDecision = this.autonomyConfig
          ? await this.autonomyConfig.canAutoApprove(agent.id, "task_creation")
          : { allowed: true, requiresApproval: false, notifyUser: false };

        if (taskDecision.requiresApproval && this.approvalService) {
          await this.approvalService.create(agent.companyId, {
            entityType: "task_creation",
            entityId: project.id,
            requestedByAgentId: agent.id,
          });
          this.logger.info({ leaderId: agent.id }, "Task creation requires approval, request created");
        } else if (taskDecision.allowed) {
          const maxNew = maxPendingTasks - pendingTasks;
          this.logger.info(
            { leaderId: agent.id, pendingTasks, maxPendingTasks, maxNew },
            `Creating up to ${maxNew} new tasks (pending: ${pendingTasks}, max: ${maxPendingTasks})`,
          );
          await this.createTasksViaClaude(agent, project, goalData, goalLinks, ideaStructured, maxNew);
        }
      } else {
        this.logger.info(
          { leaderId: agent.id, pendingTasks, maxPendingTasks },
          "Enough pending tasks, skipping task creation",
        );
      }
    } catch (err) {
      this.logger.error(
        { leaderId: agent.id, err },
        "Step 1 (task creation) failed, continuing to next steps",
      );
    }

    // ── Step 2: Hire team members (with autonomy gate) ──
    try {
      const hireDecision = this.autonomyConfig
        ? await this.autonomyConfig.canAutoApprove(agent.id, "hiring")
        : { allowed: true, requiresApproval: false, notifyUser: false };

      if (hireDecision.requiresApproval && this.approvalService) {
        await this.approvalService.create(agent.companyId, {
          entityType: "hiring",
          entityId: project.id,
          requestedByAgentId: agent.id,
        });
        this.logger.info({ leaderId: agent.id }, "Hiring requires approval, request created");
      } else if (hireDecision.allowed) {
          await this.hireTeamMembers(agent, project, ideaStructured);
        }
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
  private async runMemberHeartbeat(agent: { id: string; companyId: string; name: string; systemPrompt: string | null }) {
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

    publishLiveEvent(agent.companyId, {
      type: "activity",
      agentName: agent.name,
      agentRole: "member",
      message: `"${task.title}" 작업을 시작했어요`,
      timestamp: new Date().toISOString(),
    });

    // 2. Look up workspace and resolve secrets
    const workspace = this.workspaceService
      ? await this.workspaceService.getByProjectId(task.projectId!)
      : null;

    const secretEnv = this.secretService
      ? await this.secretService.resolveEnvBindings(agent.companyId)
      : {};

    // 3. Execute task via Claude CLI in workspace (or fallback to LLM-only)
    try {
      clearTaskOutput(task.id);

      const systemPrompt = agent.systemPrompt ?? `You are ${agent.name}, a software developer working on a real project. Create actual files and code.`;
      const taskPrompt = `You are working on the following task. Implement it by creating/editing actual files in the current working directory.

Task: ${task.title}
Description: ${task.description ?? "No additional details"}

Create real files with working code. When done, provide a brief summary of what you created.`;

      const onChunk = (chunk: string) => {
        appendTaskOutput(task.id, chunk);
        publishLiveEvent(agent.companyId, {
          type: "task:output",
          taskId: task.id,
          agentId: agent.id,
          chunk,
        });
      };

      const hasSecrets = Object.keys(secretEnv).length > 0;
      const opts: { cwd?: string; env?: Record<string, string> } = {};
      if (workspace) opts.cwd = workspace.path;
      if (hasSecrets) opts.env = secretEnv;
      const response = await callLLMStreaming(
        { system: systemPrompt, prompt: taskPrompt },
        onChunk,
        (workspace || hasSecrets) ? opts : undefined,
      );
      const summary = response.content.slice(0, 2000);

      // 4. Mark task done
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

      // Save completion result as a comment
      try {
        await this.db.insert(issueComments).values({
          companyId: agent.companyId,
          issueId: task.id,
          body: summary.slice(0, 1000),
          createdByAgentId: agent.id,
        });
      } catch (commentErr) {
        this.logger.error({ err: commentErr, taskId: task.id }, "Failed to save task result comment");
      }

      // Update goal progress based on completed tasks
      if (task.projectId) {
        try {
          await this.updateGoalProgress(task.projectId);
        } catch (err) {
          this.logger.error({ err, projectId: task.projectId }, "Goal progress update failed");
        }
      }

      this.logger.info(
        { memberId: agent.id, taskId: task.id, taskTitle: task.title },
        `Member completed task: ${task.title}`,
      );

      publishLiveEvent(agent.companyId, {
        type: "activity",
        agentName: agent.name,
        agentRole: "member",
        message: `"${task.title}" 작업을 완료했어요`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(
        { memberId: agent.id, taskId: task.id, err },
        "Member task execution failed, will retry on next heartbeat",
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
   *
   * Includes dependency awareness: Claude marks which tasks depend on others
   * and which can run in parallel. Blocked tasks go to "backlog", ready tasks
   * go to "todo". Dependencies are stored in the issue's metadata jsonb field.
   *
   * @param maxNew - Maximum number of new tasks to create (based on pending task budget)
   */
  private async createTasksViaClaude(
    agent: { id: string; companyId: string },
    project: { id: string; name: string },
    goalData: Array<{ title: string; description: string | null }>,
    goalLinks: Array<{ goalId: string }>,
    ideaStructured: Record<string, unknown> | null,
    maxNew: number,
  ) {
    // Find existing issues to avoid duplicates and to inform dependency decisions
    const existingIssues = await this.db
      .select({ title: issues.title, status: issues.status })
      .from(issues)
      .where(eq(issues.projectId, project.id));

    const existingTitles = existingIssues.map((i) => `- ${i.title} (${i.status})`).join("\n");

    // Build set of done titles for dependency resolution
    const doneTitles = new Set(
      existingIssues.filter((i) => i.status === "done").map((i) => i.title),
    );

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

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  {
    "title": "작업 제목",
    "description": "구체적으로 무엇을 해야 하는지",
    "priority": "medium",
    "depends_on": [],
    "parallel": true
  }
]

규칙:
- 현재 진행 중이거나 완료된 작업 이후의 다음 논리적 단계에 해당하는 작업만 생성하세요
- 의존성 표시: 작업 B가 작업 A의 결과를 필요로 하면 A의 제목을 depends_on에 넣으세요
- parallel: 진행 중인 작업에 의존하지 않으면 true로 표시
- 먼 미래의 단계에 해당하는 작업은 생성하지 마세요
- 최대 ${maxNew}개의 작업만 생성하세요
- 이미 존재하는 작업과 중복되지 않아야 합니다
- 각 작업은 한 명의 팀원이 독립적으로 수행할 수 있어야 합니다
- 작업은 구체적이고 실행 가능해야 합니다
- 우선순위는 "critical", "high", "medium", "low" 중 하나입니다`;

    let tasksToCreate: Array<{
      title: string;
      description: string;
      priority: string;
      depends_on?: string[];
      parallel?: boolean;
    }> = [];

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
        (t: unknown): t is { title: string; description: string; priority: string; depends_on?: string[]; parallel?: boolean } =>
          typeof t === "object" &&
          t !== null &&
          typeof (t as Record<string, unknown>).title === "string" &&
          typeof (t as Record<string, unknown>).description === "string",
      )
      .slice(0, maxNew);

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

    // Determine status based on dependency resolution:
    // - If depends_on is empty or all deps are done -> "todo"
    // - If depends_on has unmet dependencies -> "backlog"
    const getStatus = (task: { depends_on?: string[] }): "todo" | "backlog" => {
      const deps = task.depends_on ?? [];
      if (deps.length === 0) {
        return "todo";
      }
      const allDepsCompleted = deps.every((dep) => doneTitles.has(dep));
      return allDepsCompleted ? "todo" : "backlog";
    };

    const insertValues = tasksToCreate.map((task, idx) => ({
      companyId: agent.companyId,
      projectId: project.id,
      goalId: linkedGoalId,
      title: task.title,
      description: task.description,
      status: getStatus(task),
      priority: validPriorities.has(task.priority) ? task.priority : "medium",
      originKind: "decomposition",
      autoApproved: true,
      createdByAgentId: agent.id,
      sortOrder: idx,
      metadata: { depends_on: task.depends_on ?? [], parallel: task.parallel ?? true },
    }));

    const created = await this.db
      .insert(issues)
      .values(insertValues)
      .returning({ id: issues.id, title: issues.title, status: issues.status });

    const todoCount = created.filter((c) => c.status === "todo").length;
    const backlogCount = created.filter((c) => c.status === "backlog").length;

    this.logger.info(
      {
        leaderId: agent.id,
        projectId: project.id,
        createdTasks: created.map((c) => ({ id: c.id, title: c.title, status: c.status })),
        todoCount,
        backlogCount,
      },
      `Leader heartbeat created ${created.length} tasks (${todoCount} todo, ${backlogCount} backlog)`,
    );

    publishLiveEvent(agent.companyId, {
      type: "activity",
      agentName: "팀장",
      agentRole: "leader",
      message: `${created.length}개의 작업을 생성했어요`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Step 0: Promotes backlog tasks to todo when their dependencies are met.
   *
   * Checks all "backlog" tasks in the project. If a task's depends_on list
   * (stored in metadata) is empty or all referenced tasks are now "done",
   * the task is promoted to "todo" so it can be assigned to a member.
   */
  private async promoteUnblockedTasks(project: { id: string }) {
    // Get all done task titles for dependency checking
    const allIssues = await this.db
      .select({ id: issues.id, title: issues.title, status: issues.status, metadata: issues.metadata })
      .from(issues)
      .where(eq(issues.projectId, project.id));

    const doneTitles = new Set(
      allIssues.filter((i) => i.status === "done").map((i) => i.title),
    );

    const backlogTasks = allIssues.filter((i) => i.status === "backlog");

    if (backlogTasks.length === 0) return;

    let promotedCount = 0;
    for (const task of backlogTasks) {
      const metadata = task.metadata as { depends_on?: string[] } | null;
      const deps = metadata?.depends_on ?? [];

      // Promote if no dependencies or all dependencies are done
      if (deps.length === 0 || deps.every((dep) => doneTitles.has(dep))) {
        await this.db
          .update(issues)
          .set({ status: "todo", updatedAt: new Date() })
          .where(eq(issues.id, task.id));
        promotedCount++;

        this.logger.info(
          { taskId: task.id, taskTitle: task.title, resolvedDeps: deps },
          `Promoted backlog task to todo: ${task.title}`,
        );
      }
    }

    if (promotedCount > 0) {
      this.logger.info(
        { projectId: project.id, promotedCount, totalBacklog: backlogTasks.length },
        `Promoted ${promotedCount} backlog tasks to todo`,
      );
    }
  }

  /**
   * Step 2: Hires team members based on the idea's team_composition.
   *
   * - Initial hiring: if no members exist, hire from idea's team_composition
   * - Dynamic scaling: if more assignable "todo" tasks than idle members, hire one more
   *   (capped at MAX_TEAM_MEMBERS total)
   */
  private async hireTeamMembers(
    agent: { id: string; companyId: string },
    project: { id: string },
    ideaStructured: Record<string, unknown> | null,
  ) {
    const MAX_TEAM_MEMBERS = 5;

    // Check if project already has team members (non-leader agents)
    const existingMembers = await this.db
      .select({ id: agents.id, status: agents.status })
      .from(agents)
      .where(
        and(
          eq(agents.projectId, project.id),
          eq(agents.teamRole, "member"),
          sql`${agents.status} != 'terminated'`,
        ),
      );

    // ── Hire specialists for unassigned tasks ──
    // For each unassigned todo task with no idle member, hire a task-specific specialist
    if (existingMembers.length >= MAX_TEAM_MEMBERS) {
      this.logger.info(
        { leaderId: agent.id, memberCount: existingMembers.length, max: MAX_TEAM_MEMBERS },
        "Team at max capacity, skipping hiring",
      );
      return;
    }

    const idleMemberCount = existingMembers.filter((m) => m.status === "idle").length;

    const unassignedTasks = await this.db
      .select({ id: issues.id, title: issues.title, description: issues.description })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          isNull(issues.assigneeAgentId),
          eq(issues.status, "todo"),
        ),
      );

    // How many new hires are needed?
    const hiresNeeded = Math.min(
      unassignedTasks.length - idleMemberCount,
      MAX_TEAM_MEMBERS - existingMembers.length,
      2, // max 2 hires per heartbeat to avoid burst
    );

    if (hiresNeeded <= 0) return;

    // Pick tasks that need specialists
    const tasksForHiring = unassignedTasks.slice(0, hiresNeeded);

    for (const task of tasksForHiring) {
      // Ask Claude to design a specialist for this task
      let specialistInfo: { name: string; systemPrompt: string };
      try {
        const response = await callLLM({
          system: `You design specialist AI agent profiles. Given a task, create a focused specialist.
Return JSON only: { "name": "specialist title in Korean (3-5 words)", "systemPrompt": "detailed persona and instructions in Korean (5-8 sentences)" }`,
          prompt: `Design a specialist agent for this task:

Title: ${task.title}
Description: ${task.description ?? "No description"}

The specialist should have deep expertise specifically relevant to this task.
Their systemPrompt should describe their skills, approach, and focus areas.
Name should be descriptive like "API 설계 전문가" or "데이터 모델링 전문가".`,
        });
        specialistInfo = JSON.parse(response.content);
      } catch {
        // Fallback if Claude fails
        specialistInfo = {
          name: `${task.title.slice(0, 15)} 전문가`,
          systemPrompt: `당신은 "${task.title}" 작업의 전문가입니다. 이 분야에서 깊은 경험과 전문성을 가지고 있습니다.`,
        };
      }

      const [newAgent] = await this.db
        .insert(agents)
        .values(
          omitUndefined({
            companyId: agent.companyId,
            projectId: project.id,
            name: specialistInfo.name,
            teamRole: "member",
            memberType: "specialist",
            status: "idle",
            adapterId: DEFAULT_ADAPTER_ID,
            reportsTo: agent.id,
            hiredByAgentId: agent.id,
            specialization: [task.title.slice(0, 50)],
            idleBehavior: "wait",
            maxConcurrentTasks: 1,
            systemPrompt: specialistInfo.systemPrompt,
          }),
        )
        .returning();

      this.logger.info(
        {
          leaderId: agent.id,
          memberId: newAgent!.id,
          memberName: specialistInfo.name,
          forTask: task.title,
        },
        `Hired specialist: ${specialistInfo.name} for "${task.title}"`,
      );

      publishLiveEvent(agent.companyId, {
        type: "activity",
        agentName: "팀장",
        agentRole: "leader",
        message: `"${task.title}" 작업을 위해 ${specialistInfo.name}을(를) 고용했어요`,
        timestamp: new Date().toISOString(),
      });
    }
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

      publishLiveEvent(agent.companyId, {
        type: "activity",
        agentName: "팀장",
        agentRole: "leader",
        message: `"${task.title}" 작업을 ${member.name}에게 배정했어요`,
        timestamp: new Date().toISOString(),
      });

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

    // 4. Check if there are any remaining tasks (backlog, todo, or in-progress)
    const remainingTasks = await this.db
      .select({ id: issues.id })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, project.id),
          sql`${issues.status} IN ('backlog', 'todo', 'in_progress')`,
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

  /** Updates goal progress based on completed tasks ratio. */
  private async updateGoalProgress(projectId: string) {
    const projectIssues = await this.db
      .select({ status: issues.status })
      .from(issues)
      .where(eq(issues.projectId, projectId));

    if (projectIssues.length === 0) return;

    const doneCount = projectIssues.filter((i) => i.status === "done").length;
    const progress = Math.round((doneCount / projectIssues.length) * 100);

    // Update linked goals
    const goalLinks = await this.db
      .select({ goalId: projectGoals.goalId })
      .from(projectGoals)
      .where(eq(projectGoals.projectId, projectId));

    for (const link of goalLinks) {
      await this.db
        .update(goals)
        .set({ progressPercent: progress, updatedAt: new Date() })
        .where(eq(goals.id, link.goalId));
    }

    this.logger.debug({ projectId, progress, total: projectIssues.length, done: doneCount }, "Goal progress updated");
  }

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

/**
 * Generates a role-specific system prompt for a team member based on their preset.
 *
 * This gives each member a persona with relevant expertise and tech stack preferences,
 * so they produce higher-quality, role-appropriate output when executing tasks.
 */
function getMemberSystemPrompt(preset: string, memberType: string, displayName: string): string {
  const roleInstructions: Record<string, string> = {
    backend_engineer: `You are ${displayName}, a backend engineer.
Your expertise: API design, database modeling, server-side logic, authentication, performance optimization.
You write clean, well-structured server code with proper error handling and tests.
Tech stack preference: Node.js, TypeScript, PostgreSQL, REST/GraphQL APIs.`,

    frontend_engineer: `You are ${displayName}, a frontend engineer.
Your expertise: UI/UX implementation, responsive design, state management, accessibility.
You build intuitive, performant user interfaces with modern frameworks.
Tech stack preference: React, TypeScript, Tailwind CSS, component-driven development.`,

    fullstack_engineer: `You are ${displayName}, a fullstack engineer.
Your expertise: End-to-end feature development from database to UI.
You can handle both frontend and backend tasks efficiently.
Tech stack preference: React, Node.js, TypeScript, PostgreSQL.`,

    devops_engineer: `You are ${displayName}, a DevOps engineer.
Your expertise: CI/CD pipelines, containerization, cloud infrastructure, monitoring.
You ensure reliable deployments and system observability.
Tech stack preference: Docker, GitHub Actions, Terraform, monitoring tools.`,

    qa_engineer: `You are ${displayName}, a QA engineer.
Your expertise: Test strategy, automated testing, bug detection, quality assurance.
You write comprehensive test suites and ensure software reliability.
Tech stack preference: Jest, Playwright, testing best practices.`,

    designer: `You are ${displayName}, a UI/UX designer.
Your expertise: User interface design, user experience flows, design systems, accessibility.
You create intuitive and visually appealing interfaces.
Focus: Wireframes, component design, responsive layouts.`,

    tech_lead: `You are ${displayName}, a tech lead.
Your expertise: Architecture decisions, code review, technical mentoring, system design.
You guide technical direction and ensure code quality.
Focus: Clean architecture, scalability, maintainability.`,
  };

  return roleInstructions[preset] ?? `You are ${displayName}, a ${memberType}.
You execute tasks assigned to you with care and quality.`;
}
