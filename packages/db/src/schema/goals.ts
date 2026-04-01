// packages/db/src/schema/goals.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

// ===== goals =====
export const goals = pgTable(
  "goals",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),

    completionCriteria: jsonb("completion_criteria"),
    autoDecompose: boolean("auto_decompose").notNull().default(true),
    decompositionStrategy: text("decomposition_strategy").default("balanced"),
    estimatedTotalTokens: bigint("estimated_total_tokens", { mode: "number" }),
    progressPercent: integer("progress_percent").default(0),

    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdByUserId: text("created_by_user_id"),

    ...timestamps,
  },
  (table) => [
    index("idx_goals_company_status").on(table.companyId, table.status),
    index("idx_goals_parent").on(table.parentId),
  ],
);

// ===== task_templates =====
export const taskTemplates = pgTable(
  "task_templates",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    titleTemplate: text("title_template").notNull(),
    descriptionTemplate: text("description_template"),
    priority: text("priority").notNull().default("medium"),
    estimatedTokens: integer("estimated_tokens"),
    requiredSkills: jsonb("required_skills"),

    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdByUserId: text("created_by_user_id"),

    ...timestamps,
  },
  (table) => [uniqueIndex("uq_task_template_name").on(table.companyId, table.name)],
);

// ===== task_generation_rules =====
export const taskGenerationRules = pgTable(
  "task_generation_rules",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),

    ruleType: text("rule_type").notNull().default("decomposition"),
    triggerCondition: jsonb("trigger_condition").notNull(),
    templateId: uuid("template_id").references(() => taskTemplates.id),

    priority: text("priority").notNull().default("medium"),
    assigneeStrategy: text("assignee_strategy").notNull().default("auto"),
    assigneeAgentId: uuid("assignee_agent_id").references(() => agents.id),

    maxConcurrentTasks: integer("max_concurrent_tasks").default(5),
    isActive: boolean("is_active").notNull().default(true),

    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdByUserId: text("created_by_user_id"),

    ...timestamps,
  },
  (table) => [
    index("idx_task_gen_rules_goal").on(table.goalId, table.isActive),
    index("idx_task_gen_rules_company").on(table.companyId, table.isActive),
  ],
);

// ===== exploration_sessions =====
export const explorationSessions = pgTable(
  "exploration_sessions",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),

    triggerReason: text("trigger_reason").notNull().default("idle"),
    status: text("status").notNull().default("active"),

    discoveredTasks: jsonb("discovered_tasks"),
    createdIssues: uuid("created_issues").array(),
    recommendations: jsonb("recommendations"),
    tokenCostCents: integer("token_cost_cents").default(0),

    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_exploration_company_agent").on(table.companyId, table.agentId, table.status),
  ],
);
