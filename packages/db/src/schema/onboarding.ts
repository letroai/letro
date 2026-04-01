// packages/db/src/schema/onboarding.ts
import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";
import { goals } from "./goals.js";

// ===== user_ideas =====
export const userIdeas = pgTable("user_ideas", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: text("user_id"),

  rawText: text("raw_text").notNull(),
  structured: jsonb("structured"),
  status: text("status").notNull().default("pending"),

  goalId: uuid("goal_id").references(() => goals.id),

  ...timestamps,
});

// ===== onboarding_sessions =====
export const onboardingSessions = pgTable("onboarding_sessions", {
  id: id,
  companyId: uuid("company_id").references(() => companies.id),
  userId: text("user_id"),

  status: text("status").notNull().default("idea_input"),

  ideaId: uuid("idea_id").references(() => userIdeas.id),
  planData: jsonb("plan_data"),
  connections: jsonb("connections"),

  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ===== oauth_connections =====
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: id,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    displayName: text("display_name"),

    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").array(),

    status: text("status").notNull().default("active"),

    connectedByUserId: text("connected_by_user_id"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("uq_oauth_connection").on(
      table.companyId,
      table.provider,
      table.providerAccountId,
    ),
  ],
);
