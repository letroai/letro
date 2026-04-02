// packages/db/src/schema/auth.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";

// ===== users (Better Auth standard) =====
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Better Auth uses text ID
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

// ===== sessions =====
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

// ===== accounts (OAuth account linking) =====
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  ...timestamps,
});

// ===== verifications (email verification tokens) =====
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

// ===== instance_settings (singleton) =====
export const instanceSettings = pgTable("instance_settings", {
  id: id,
  deploymentMode: text("deployment_mode").notNull().default("local_machine"),
  authMode: text("auth_mode").notNull().default("local_trusted"),
  defaultCompanyId: uuid("default_company_id"),
  settings: jsonb("settings").default({}),
  ...timestamps,
});

// ===== user_preferences =====
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  theme: text("theme").notNull().default("system"), // 'light' | 'dark' | 'system'
  lastProjectId: text("last_project_id"),
  ...timestamps,
});

// ===== instance_user_roles =====
export const instanceUserRoles = pgTable(
  "instance_user_roles",
  {
    id: id,
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("user"), // 'admin', 'user'
    ...timestamps,
  },
  (table) => [uniqueIndex("uq_instance_user_role").on(table.userId)],
);
