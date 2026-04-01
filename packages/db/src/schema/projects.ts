// packages/db/src/schema/projects.ts
import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { goals } from "./goals.js";

// ===== projects =====
export const projects = pgTable(
  "projects",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    repoUrl: text("repo_url"),

    leaderAgentId: uuid("leader_agent_id")
      .notNull()
      .references(() => agents.id),

    autonomyLevelOverride: integer("autonomy_level_override"),
    autoTaskGeneration: boolean("auto_task_generation").notNull().default(true),

    settings: jsonb("settings").default({}),
    ...timestamps,
  },
  (table) => [
    index("idx_projects_company").on(table.companyId),
    index("idx_projects_leader").on(table.leaderAgentId),
  ],
);

// ===== project_workspaces =====
export const projectWorkspaces = pgTable("project_workspaces", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  strategy: text("strategy").notNull().default("agent_default"),
  ...timestamps,
});

// ===== project_goals (N:M link) =====
export const projectGoals = pgTable("project_goals", {
  id: id,
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  ...timestamps,
});

// ===== execution_workspaces =====
export const executionWorkspaces = pgTable("execution_workspaces", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => agents.id),
  path: text("path").notNull(),
  branch: text("branch"),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

// ===== workspace_operations =====
export const workspaceOperations = pgTable("workspace_operations", {
  id: id,
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => executionWorkspaces.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});
