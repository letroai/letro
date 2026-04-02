// server/src/routes/project-scope.routes.ts
// Routes scoped to a specific project.
// Delegates to service layer — no direct DB queries.

import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { eq, and, sql } from "drizzle-orm";
import { projectGoals, goals, agents, issues, issueComments } from "@letro/db/schema";
import { getTaskOutput, loadTaskOutputFromDB } from "../lib/task-output-store.js";
import { publishLiveEvent } from "../ws/websocket-server.js";
import { getCompanyId } from "../lib/route-helpers.js";

export const projectScopeRoutes = new Hono<AppBindings>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate projectId on all project-scoped routes
projectScopeRoutes.use("/projects/:projectId/*", async (c, next) => {
  const projectId = c.req.param("projectId");
  if (!projectId || !UUID_RE.test(projectId)) {
    return c.json({ message: "Invalid project ID" }, 400);
  }
  await next();
});

// GET /api/projects/:projectId/tasks
projectScopeRoutes.get("/projects/:projectId/tasks", async (c) => {
  const projectId = c.req.param("projectId");
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json({ issues: [], total: 0 });

  const services = c.get("services");
  const filters: Record<string, string> = { projectId };
  const status = c.req.query("status");
  const assigneeId = c.req.query("assigneeId");
  if (status) filters["status"] = status;
  if (assigneeId) filters["assigneeAgentId"] = assigneeId;
  const result = await services.issue.list(companyId, filters);

  // Enrich issues with assignee name
  const agentIds = [...new Set(result.issues.map((i: Record<string, unknown>) => i["assigneeAgentId"]).filter(Boolean))] as string[];
  const agentNames: Record<string, string> = {};
  for (const aid of agentIds) {
    const agent = await services.agent.getById(aid);
    if (agent) agentNames[aid] = (agent as Record<string, unknown>)["name"] as string;
  }
  const enriched = result.issues.map((i: Record<string, unknown>) => ({
    ...i,
    assigneeName: i["assigneeAgentId"] ? agentNames[i["assigneeAgentId"] as string] ?? null : null,
  }));

  return c.json({ issues: enriched, total: result.total });
});

// GET /api/projects/:projectId/tasks/:taskId
projectScopeRoutes.get("/projects/:projectId/tasks/:taskId", async (c) => {
  const services = c.get("services");
  const task = await services.issue.getById(c.req.param("taskId"));
  if (!task) return c.json({ message: "작업을 찾을 수 없어요" }, 404);
  return c.json(task);
});

// GET /api/projects/:projectId/tasks/:taskId/comments
projectScopeRoutes.get("/projects/:projectId/tasks/:taskId/comments", async (c) => {
  const services = c.get("services");
  const rawComments = await services.issue.listComments(c.req.param("taskId"));

  // Map DB fields to UI-expected format
  const mapped = await Promise.all(rawComments.map(async (cm) => {
    let authorName = "시스템";
    let authorType: "human" | "agent" = "agent";
    if (cm.createdByAgentId) {
      const agent = await services.agent.getById(cm.createdByAgentId);
      authorName = (agent as Record<string, unknown> | null)?.name as string ?? "팀원";
    } else if (cm.createdByUserId) {
      authorName = "나";
      authorType = "human";
    }
    return {
      id: cm.id,
      taskId: cm.issueId,
      authorId: cm.createdByAgentId ?? cm.createdByUserId ?? "",
      authorName,
      authorType,
      content: cm.body ?? "",
      createdAt: cm.createdAt?.toISOString?.() ?? cm.createdAt,
    };
  }));

  return c.json(mapped);
});

// POST /api/projects/:projectId/tasks/:taskId/comments
projectScopeRoutes.post("/projects/:projectId/tasks/:taskId/comments", async (c) => {
  const services = c.get("services");
  const body = await c.req.json() as Record<string, unknown>;
  const comment = await services.issue.addComment(c.req.param("taskId"), {
    body: String(body["body"] ?? ""),
  });
  return c.json(comment, 201);
});

// GET /api/projects/:projectId/tasks/:taskId/output
projectScopeRoutes.get("/projects/:projectId/tasks/:taskId/output", async (c) => {
  const taskId = c.req.param("taskId");
  const output = await loadTaskOutputFromDB(taskId);
  return c.json({ output });
});

// GET /api/projects/:projectId/goals
projectScopeRoutes.get("/projects/:projectId/goals", async (c) => {
  const projectId = c.req.param("projectId");
  // TODO: GoalService doesn't support projectId filtering via project_goals join yet.
  // Keeping inline DB query for the project_goals join until service is extended.
  const db = c.get("db");
  const linked = await db
    .select({ goalId: projectGoals.goalId })
    .from(projectGoals)
    .where(eq(projectGoals.projectId, projectId));
  const goalIds = linked.map((r) => r.goalId);
  if (goalIds.length === 0) return c.json([]);
  const result = await db
    .select()
    .from(goals)
    .where(sql`${goals.id} IN ${goalIds}`);
  return c.json(result);
});

// GET /api/projects/:projectId/team
projectScopeRoutes.get("/projects/:projectId/team", async (c) => {
  const projectId = c.req.param("projectId");
  const services = c.get("services");

  const project = await services.project.getById(projectId);
  if (!project) return c.json({ leader: null, members: [], totalCount: 0 });

  const { leader, members } = await services.project.getTeam(projectId);

  return c.json({
    leader,
    members,
    totalCount: members.length + (leader ? 1 : 0),
  });
});

// GET /api/projects/:projectId/dashboard
projectScopeRoutes.get("/projects/:projectId/dashboard", async (c) => {
  const projectId = c.req.param("projectId");
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json({ error: "Company ID required" }, 400);

  const services = c.get("services");

  const project = await services.project.getById(projectId);
  if (!project) return c.json({});

  // Team stats via project service
  const { leader, members } = await services.project.getTeam(projectId);
  const teamAgents = leader ? [leader, ...members] : [...members];

  // Issue stats via issue service
  const { issues: projectIssues } = await services.issue.list(companyId, { projectId });

  // TODO: GoalService doesn't support projectId filtering via project_goals join yet.
  // Keeping inline DB query for the project_goals join until service is extended.
  const db = c.get("db");
  const linked = await db
    .select({ goalId: projectGoals.goalId })
    .from(projectGoals)
    .where(eq(projectGoals.projectId, projectId));
  const goalIds = linked.map((r) => r.goalId);
  const projectGoalsList = goalIds.length > 0
    ? await db.select().from(goals).where(sql`${goals.id} IN ${goalIds}`)
    : [];

  const activeAgents = teamAgents.filter((a) => a.status === "idle" || a.status === "working").length;
  const inProgressIssues = projectIssues.filter((i) => i.status === "in_progress").length;
  const completedIssues = projectIssues.filter((i) => i.status === "done").length;

  return c.json({
    totalAgents: teamAgents.length,
    activeAgents,
    leaderCount: teamAgents.filter((a) => a.teamRole === "leader").length,
    memberCount: teamAgents.filter((a) => a.teamRole === "member").length,
    totalIssues: projectIssues.length,
    openIssues: projectIssues.filter((i) => i.status === "backlog" || i.status === "todo").length,
    inProgressIssues,
    completedIssues,
    activeGoals: projectGoalsList.filter((g) => g.status === "active" || g.status === "draft").length,
    completedGoals: projectGoalsList.filter((g) => g.status === "completed").length,
    averageProgress: projectGoalsList.length > 0
      ? Math.round(projectGoalsList.reduce((sum, g) => sum + (g.progressPercent ?? 0), 0) / projectGoalsList.length)
      : 0,
    monthlyCostCents: 0, // TODO: project-scoped cost tracking
    budgetRemainingCents: 0,
    budgetUsedPercent: 0,
    recentActivities: [],
    helpRequests: [],
    userFacingSummary: activeAgents > 0
      ? `팀원 ${activeAgents}명이 활동 중이에요.`
      : "아직 팀원이 활동하지 않고 있어요.",
  });
});

// GET /api/projects/:projectId/agents/:agentId
projectScopeRoutes.get("/projects/:projectId/agents/:agentId", async (c) => {
  const services = c.get("services");
  const agent = await services.agent.getById(c.req.param("agentId"));
  if (!agent) return c.json({ message: "Not found" }, 404);
  return c.json(agent);
});

// GET /api/projects/:projectId/costs/summary
projectScopeRoutes.get("/projects/:projectId/costs/summary", async (c) => {
  // TODO: project-scoped cost aggregation
  return c.json({ totalCostCents: 0, totalTokens: 0, eventCount: 0, period: "month" });
});

// GET /api/projects/:projectId/costs/by-agent
projectScopeRoutes.get("/projects/:projectId/costs/by-agent", async (c) => {
  return c.json([]);
});

// GET /api/projects/:projectId/activity
projectScopeRoutes.get("/projects/:projectId/activity", async (c) => {
  return c.json({ entries: [], total: 0 });
});

// GET /api/projects/:projectId/results/tree
projectScopeRoutes.get("/projects/:projectId/results/tree", async (c) => {
  const projectId = c.req.param("projectId");
  const services = c.get("services");
  try {
    const tree = await services.workspace.getFileTree(projectId);
    return c.json(tree);
  } catch {
    return c.json({ name: "root", path: "/", type: "directory", children: [] });
  }
});

// GET /api/projects/:projectId/results/file
projectScopeRoutes.get("/projects/:projectId/results/file", async (c) => {
  const projectId = c.req.param("projectId");
  const filePath = c.req.query("path");
  if (!filePath) return c.json({ message: "path required" }, 400);

  const services = c.get("services");
  try {
    const content = await services.workspace.getFileContent(projectId, filePath);
    return c.json(content);
  } catch {
    return c.json({ path: filePath, content: "", language: "text", size: 0 }, 404);
  }
});

// GET /api/projects/:projectId/work-style
projectScopeRoutes.get("/projects/:projectId/work-style", async (c) => {
  return c.json({ style: "auto", updatedAt: new Date().toISOString() });
});

// PATCH /api/projects/:projectId/work-style
projectScopeRoutes.patch("/projects/:projectId/work-style", async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  return c.json({ style: body["style"] ?? "auto", updatedAt: new Date().toISOString() });
});

// POST /api/projects/:projectId/pause
projectScopeRoutes.post("/projects/:projectId/pause", async (c) => {
  const projectId = c.req.param("projectId");
  const db = c.get("db");
  const services = c.get("services");
  const logger = c.get("logger");

  const project = await services.project.getById(projectId);
  if (!project) return c.json({ message: "Project not found" }, 404);

  // 1. Pause all project agents (leader + members)
  const projectAgents = await db
    .select({ id: agents.id, name: agents.name, teamRole: agents.teamRole })
    .from(agents)
    .where(and(
      eq(agents.projectId, projectId),
      sql`${agents.status} NOT IN ('terminated')`,
    ));

  for (const agent of projectAgents) {
    await db
      .update(agents)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(agents.id, agent.id));
  }

  // 2. Save in_progress task outputs as comments, then reset tasks
  const inProgressTasks = await db
    .select({ id: issues.id, companyId: issues.companyId, assigneeAgentId: issues.assigneeAgentId })
    .from(issues)
    .where(and(
      eq(issues.projectId, projectId),
      eq(issues.status, "in_progress"),
    ));

  for (const task of inProgressTasks) {
    // Preserve streaming output as a comment before clearing
    const output = getTaskOutput(task.id);
    if (output && output.length > 0) {
      try {
        await db.insert(issueComments).values({
          companyId: task.companyId,
          issueId: task.id,
          body: `(정지 시점 작업 내역)\n${output.slice(0, 2000)}`,
          createdByAgentId: task.assigneeAgentId,
        });
      } catch { /* ignore */ }
    }

    await db
      .update(issues)
      .set({
        status: "todo",
        assigneeAgentId: null,
        checkedOutBy: null,
        checkedOutAt: null,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, task.id));
  }

  // 3. Mark project as paused via settings
  await services.project.update(projectId, {
    settings: { ...(project as Record<string, unknown>)["settings"] as object, paused: true },
  });

  logger.info({ projectId, agentsPaused: projectAgents.length, tasksReset: inProgressTasks.length }, "Project paused");

  const companyId = getCompanyId(c.get("actor"));
  if (companyId) {
    publishLiveEvent(companyId, {
      type: "project:updated",
      projectId,
      message: "프로젝트가 정지되었어요",
    });
  }

  return c.json({
    paused: true,
    agentsPaused: projectAgents.length,
    tasksReset: inProgressTasks.length,
  });
});

// POST /api/projects/:projectId/resume
projectScopeRoutes.post("/projects/:projectId/resume", async (c) => {
  const projectId = c.req.param("projectId");
  const db = c.get("db");
  const services = c.get("services");
  const logger = c.get("logger");

  const project = await services.project.getById(projectId);
  if (!project) return c.json({ message: "Project not found" }, 404);

  // 1. Resume leader agent (set to idle so heartbeat loop can start)
  const leaderAgentId = (project as Record<string, unknown>)["leaderAgentId"] as string;
  if (leaderAgentId) {
    await db
      .update(agents)
      .set({ status: "idle", updatedAt: new Date() })
      .where(eq(agents.id, leaderAgentId));
  }

  // 2. Resume all member agents
  const pausedMembers = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(
      eq(agents.projectId, projectId),
      eq(agents.teamRole, "member"),
      eq(agents.status, "paused"),
    ));

  for (const member of pausedMembers) {
    await db
      .update(agents)
      .set({ status: "idle", updatedAt: new Date() })
      .where(eq(agents.id, member.id));
  }

  // 3. Mark project as active via settings
  await services.project.update(projectId, {
    settings: { ...(project as Record<string, unknown>)["settings"] as object, paused: false },
  });

  // 4. Trigger leader heartbeat to assess and assign
  if (leaderAgentId) {
    const heartbeatService = services.heartbeat;
    setTimeout(() => {
      heartbeatService.executeHeartbeat(leaderAgentId).catch((err: unknown) =>
        logger.error({ err, agentId: leaderAgentId }, "Resume leader heartbeat failed"),
      );
    }, 1000);
  }

  logger.info({ projectId, membersResumed: pausedMembers.length }, "Project resumed");

  const companyId = getCompanyId(c.get("actor"));
  if (companyId) {
    publishLiveEvent(companyId, {
      type: "project:updated",
      projectId,
      message: "프로젝트가 재개되었어요",
    });
  }

  return c.json({
    paused: false,
    membersResumed: pausedMembers.length,
  });
});
