// packages/db/src/schema/execution.ts
import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { explorationSessions } from "./goals.js";

// ===== heartbeat_runs =====
export const heartbeatRuns = pgTable(
  "heartbeat_runs",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => issues.id),

    status: text("status").notNull().default("queued"),

    autonomyContext: jsonb("autonomy_context"),
    explorationSessionId: uuid("exploration_session_id").references(() => explorationSessions.id),

    prompt: text("prompt"),
    output: text("output"),
    errorMessage: text("error_message"),
    tokenCount: integer("token_count"),
    costCents: integer("cost_cents"),

    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    timeoutAt: timestamp("timeout_at", { withTimezone: true }),

    metadata: jsonb("metadata").default({}),
    ...timestamps,
  },
  (table) => [
    index("idx_heartbeat_runs_company_agent").on(table.companyId, table.agentId, table.status),
    index("idx_heartbeat_runs_issue").on(table.issueId),
  ],
);

// ===== heartbeat_run_events =====
export const heartbeatRunEvents = pgTable("heartbeat_run_events", {
  id: id,
  runId: uuid("run_id")
    .notNull()
    .references(() => heartbeatRuns.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  data: jsonb("data"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== workspace_runtime_services =====
export const workspaceRuntimeServices = pgTable("workspace_runtime_services", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull(),
  serviceName: text("service_name").notNull(),
  port: integer("port"),
  pid: integer("pid"),
  status: text("status").notNull().default("running"),
  ...timestamps,
});

// ===== activity_log =====
export const activityLog = pgTable(
  "activity_log",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    agentId: uuid("agent_id").references(() => agents.id),
    userId: text("user_id"),
    summary: text("summary"),
    details: jsonb("details"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_activity_log_company").on(table.companyId, table.occurredAt),
    index("idx_activity_log_entity").on(table.entityType, table.entityId),
  ],
);

// ===== agent_peer_reviews =====
export const agentPeerReviews = pgTable(
  "agent_peer_reviews",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    reviewerAgentId: uuid("reviewer_agent_id")
      .notNull()
      .references(() => agents.id),
    revieweeAgentId: uuid("reviewee_agent_id")
      .notNull()
      .references(() => agents.id),
    issueId: uuid("issue_id").references(() => issues.id),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id),

    reviewType: text("review_type").notNull().default("code_review"),
    verdict: text("verdict").notNull().default("pending"),
    score: integer("score"),
    feedback: text("feedback"),
    suggestions: jsonb("suggestions"),

    ...timestamps,
  },
  (table) => [
    index("idx_peer_reviews_reviewee").on(table.companyId, table.revieweeAgentId),
    index("idx_peer_reviews_issue").on(table.issueId),
  ],
);
