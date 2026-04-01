// packages/db/src/schema/finance.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { heartbeatRuns } from "./execution.js";
import { budgetPolicies } from "./agents.js";

// ===== cost_events =====
export const costEvents = pgTable(
  "cost_events",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id),

    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    tokenCount: integer("token_count"),
    model: text("model"),
    metadata: jsonb("metadata"),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_cost_events_company_agent").on(table.companyId, table.agentId, table.occurredAt),
  ],
);

// ===== finance_events =====
export const financeEvents = pgTable("finance_events", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  costEventId: uuid("cost_event_id").references(() => costEvents.id),
  kind: text("kind").notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===== budget_incidents =====
export const budgetIncidents = pgTable(
  "budget_incidents",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => budgetPolicies.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("open"),
    currentSpendCents: integer("current_spend_cents").notNull(),
    limitCents: integer("limit_cents").notNull(),

    autoResolutionPolicy: text("auto_resolution_policy"),
    autoResolved: boolean("auto_resolved").notNull().default(false),
    userNotifiedAt: timestamp("user_notified_at", { withTimezone: true }),
    userResponse: text("user_response"),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("idx_budget_incidents_company").on(table.companyId, table.autoResolved, table.status),
  ],
);

// ===== approvals =====
export const approvals = pgTable("approvals", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),

  status: text("status").notNull().default("pending"),

  requestedByAgentId: uuid("requested_by_agent_id").references(() => agents.id),
  requestedByUserId: text("requested_by_user_id"),
  resolvedByUserId: text("resolved_by_user_id"),
  resolutionNote: text("resolution_note"),

  expiresAt: timestamp("expires_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});
