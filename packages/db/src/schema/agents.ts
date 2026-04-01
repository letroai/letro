// packages/db/src/schema/agents.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";

// ===== agents =====
export const agents = pgTable(
  "agents",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"), // FK to projects — no declarative FK to avoid circular reference
    name: text("name").notNull(),
    adapterId: text("adapter_id").notNull().default("claude_local"),

    // Team structure
    teamRole: text("team_role").notNull().default("member"),
    memberType: text("member_type"),
    reportsTo: uuid("reports_to"), // self-reference (member → leader)

    // Autonomy
    autonomyLevel: integer("autonomy_level").notNull().default(4),

    // Status
    status: text("status").notNull().default("idle"),

    // Hire/fire history
    hiredByAgentId: uuid("hired_by_agent_id"),
    firedByAgentId: uuid("fired_by_agent_id"),
    firedAt: timestamp("fired_at", { withTimezone: true }),
    fireReason: text("fire_reason"),

    // Capabilities/Performance
    specialization: text("specialization").array(),
    performanceScore: integer("performance_score").default(50),
    idleBehavior: text("idle_behavior").notNull().default("wait"),
    maxConcurrentTasks: integer("max_concurrent_tasks").notNull().default(1),

    // Configuration
    systemPrompt: text("system_prompt"),
    config: jsonb("config").default({}),
    metadata: jsonb("metadata").default({}),

    ...timestamps,
  },
  (table) => [
    index("idx_agents_company_status").on(table.companyId, table.status),
    index("idx_agents_company_autonomy").on(table.companyId, table.autonomyLevel),
    index("idx_agents_project").on(table.projectId),
  ],
);

// ===== agent_api_keys =====
export const agentApiKeys = pgTable("agent_api_keys", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  label: text("label"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
});

// ===== agent_config_revisions =====
export const agentConfigRevisions = pgTable("agent_config_revisions", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull(),
  config: jsonb("config").notNull(),
  changedBy: text("changed_by"),
  changeReason: text("change_reason"),
  ...timestamps,
});

// ===== agent_runtime_state =====
export const agentRuntimeState = pgTable("agent_runtime_state", {
  id: id,
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" })
    .unique(),
  currentRunId: uuid("current_run_id"),
  currentIssueId: uuid("current_issue_id"),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  nextWakeupAt: timestamp("next_wakeup_at", { withTimezone: true }),
  state: jsonb("state").default({}),
  ...timestamps,
});

// ===== agent_task_sessions =====
export const agentTaskSessions = pgTable("agent_task_sessions", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

// ===== agent_wakeup_requests =====
export const agentWakeupRequests = pgTable("agent_wakeup_requests", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  requestedByAgentId: uuid("requested_by_agent_id"),
  requestedByUserId: text("requested_by_user_id"),
  ...timestamps,
});

// ===== budget_policies =====
export const budgetPolicies = pgTable("budget_policies", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  scopeType: text("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  periodDays: integer("period_days").notNull().default(30),
  softCapPercent: integer("soft_cap_percent").notNull().default(80),
  hardCapPercent: integer("hard_cap_percent").notNull().default(100),

  // Letro extensions
  softCapAction: text("soft_cap_action").notNull().default("notify"),
  hardCapAction: text("hard_cap_action").notNull().default("notify_and_pause"),
  autoIncreaseEnabled: boolean("auto_increase_enabled").notNull().default(false),
  autoIncreaseMaxPercent: integer("auto_increase_max_percent").default(20),

  ...timestamps,
});

// ===== autonomy_levels =====
export const autonomyLevels = pgTable(
  "autonomy_levels",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    // Level permissions
    requireTaskApproval: boolean("require_task_approval").notNull().default(true),
    requireHireApproval: boolean("require_hire_approval").notNull().default(true),
    requireFireApproval: boolean("require_fire_approval").notNull().default(true),
    requireBudgetApproval: boolean("require_budget_approval").notNull().default(true),
    allowTaskCreation: boolean("allow_task_creation").notNull().default(false),
    allowTaskDecomposition: boolean("allow_task_decomposition").notNull().default(false),
    allowAgentHiring: boolean("allow_agent_hiring").notNull().default(false),
    allowAgentFiring: boolean("allow_agent_firing").notNull().default(false),
    allowExploration: boolean("allow_exploration").notNull().default(false),
    maxCostPerActionCents: integer("max_cost_per_action_cents"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("uq_autonomy_level").on(table.companyId, table.level),
    index("idx_autonomy_levels_company").on(table.companyId, table.level),
  ],
);

// ===== agent_capabilities =====
export const agentCapabilities = pgTable(
  "agent_capabilities",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    capabilityKey: text("capability_key").notNull(),
    granted: boolean("granted").notNull().default(true),
    grantedByAgentId: uuid("granted_by_agent_id"),
    grantedByUserId: text("granted_by_user_id"),
    conditions: jsonb("conditions"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uq_agent_capability").on(table.agentId, table.capabilityKey),
    index("idx_agent_caps_agent").on(table.agentId, table.capabilityKey),
  ],
);
