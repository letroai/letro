// packages/db/src/schema/companies.ts
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
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";

// ===== companies =====
export const companies = pgTable("companies", {
  id: id,
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),

  // Letro autonomy extensions
  defaultAutonomyLevel: integer("default_autonomy_level").notNull().default(4),
  tokenBudgetMonthly: bigint("token_budget_monthly", { mode: "number" }),
  autoHireEnabled: boolean("auto_hire_enabled").notNull().default(true),
  autoFireEnabled: boolean("auto_fire_enabled").notNull().default(false),
  explorationEnabled: boolean("exploration_enabled").notNull().default(true),
  peerReviewRequired: boolean("peer_review_required").notNull().default(false),

  // Paperclip legacy
  budgetMonthlyCents: integer("budget_monthly_cents"),
  settings: jsonb("settings").default({}),

  ...timestamps,
});

// ===== company_memberships =====
export const companyMemberships = pgTable(
  "company_memberships",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"), // 'owner', 'admin', 'member'
    ...timestamps,
  },
  (table) => [uniqueIndex("uq_company_membership").on(table.companyId, table.userId)],
);

// ===== company_logos =====
export const companyLogos = pgTable("company_logos", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  data: text("data").notNull(), // base64 or URL
  mimeType: text("mime_type").notNull().default("image/png"),
  ...timestamps,
});

// ===== company_secrets =====
export const companySecrets = pgTable(
  "company_secrets",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    description: text("description"),
    envVar: text("env_var"),
    ...timestamps,
  },
  (table) => [uniqueIndex("uq_company_secret_key").on(table.companyId, table.key)],
);

// ===== company_secret_versions =====
export const companySecretVersions = pgTable("company_secret_versions", {
  id: id,
  secretId: uuid("secret_id")
    .notNull()
    .references(() => companySecrets.id, { onDelete: "cascade" }),
  encryptedValue: text("encrypted_value").notNull(),
  version: integer("version").notNull(),
  createdByUserId: text("created_by_user_id"),
  ...timestamps,
});

// ===== company_skills =====
export const companySkills = pgTable(
  "company_skills",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    definition: text("definition"),
    systemPrompt: text("system_prompt"),
    ...timestamps,
  },
  (table) => [uniqueIndex("uq_company_skill_name").on(table.companyId, table.name)],
);

// ===== principal_permission_grants =====
export const principalPermissionGrants = pgTable("principal_permission_grants", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  principalType: text("principal_type").notNull(), // 'user', 'agent'
  principalId: text("principal_id").notNull(),
  permission: text("permission").notNull(),
  resourceType: text("resource_type"),
  resourceId: uuid("resource_id"),
  ...timestamps,
});

// ===== invites =====
export const invites = pgTable("invites", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  email: text("email"),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default("member"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdByUserId: text("created_by_user_id"),
  ...timestamps,
});
