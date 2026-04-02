// packages/db/src/schema/routines.ts
import { pgTable, uuid, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { agents } from "./agents.js";

// ===== routines =====
export const routines = pgTable("routines", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id),
  name: text("name").notNull(),
  description: text("description"),
  cronExpression: text("cron_expression"), // e.g. "0 9 * * *" (매일 오전 9시)
  enabled: boolean("enabled").notNull().default(true),
  taskTemplate: jsonb("task_template"), // Template for task creation
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  ...timestamps,
});

// ===== routine_runs =====
export const routineRuns = pgTable("routine_runs", {
  id: id,
  routineId: uuid("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  result: jsonb("result"),
  ...timestamps,
});
