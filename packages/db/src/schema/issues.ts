// packages/db/src/schema/issues.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { goals } from "./goals.js";
import { projects } from "./projects.js";
import { taskGenerationRules } from "./goals.js";

// ===== issues =====
export const issues = pgTable(
  "issues",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id),
    goalId: uuid("goal_id").references(() => goals.id),
    parentId: uuid("parent_id"),

    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("backlog"),
    priority: text("priority").notNull().default("medium"),

    assigneeAgentId: uuid("assignee_agent_id").references(() => agents.id),
    sortOrder: integer("sort_order").notNull().default(0),

    originKind: text("origin_kind").notNull().default("manual"),
    autoApproved: boolean("auto_approved").notNull().default(false),
    generatedByRuleId: uuid("generated_by_rule_id").references(() => taskGenerationRules.id),

    estimatedTokens: integer("estimated_tokens"),
    actualTokens: integer("actual_tokens"),

    peerReviewStatus: text("peer_review_status").default("not_required"),
    reviewerAgentId: uuid("reviewer_agent_id").references(() => agents.id),

    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdByUserId: text("created_by_user_id"),

    checkedOutBy: uuid("checked_out_by").references(() => agents.id),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),

    metadata: jsonb("metadata").default({}),
    ...timestamps,
  },
  (table) => [
    index("idx_issues_company_status").on(table.companyId, table.status, table.assigneeAgentId),
    index("idx_issues_origin").on(table.companyId, table.originKind),
    index("idx_issues_generated_by").on(table.generatedByRuleId),
    index("idx_issues_project").on(table.projectId, table.status),
    index("idx_issues_goal").on(table.goalId),
    index("idx_issues_parent").on(table.parentId),
  ],
);

// ===== issue_comments =====
export const issueComments = pgTable("issue_comments", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
  createdByUserId: text("created_by_user_id"),
  ...timestamps,
});

// ===== labels =====
export const labels = pgTable("labels", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  ...timestamps,
});

// ===== issue_labels (N:M) =====
export const issueLabels = pgTable("issue_labels", {
  id: id,
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  labelId: uuid("label_id")
    .notNull()
    .references(() => labels.id, { onDelete: "cascade" }),
  ...timestamps,
});

// ===== issue_attachments =====
export const issueAttachments = pgTable("issue_attachments", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  uploadedByAgentId: uuid("uploaded_by_agent_id").references(() => agents.id),
  uploadedByUserId: text("uploaded_by_user_id"),
  ...timestamps,
});

// ===== issue_documents =====
export const issueDocuments = pgTable("issue_documents", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  format: text("format").notNull().default("markdown"),
  createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
  createdByUserId: text("created_by_user_id"),
  ...timestamps,
});

// ===== issue_work_products =====
export const issueWorkProducts = pgTable("issue_work_products", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  externalUrl: text("external_url"),
  externalId: text("external_id"),
  title: text("title"),
  metadata: jsonb("metadata").default({}),
  ...timestamps,
});
