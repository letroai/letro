// packages/db/src/schema/plugins.ts
import { pgTable, uuid, text, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers.js";
import { companies } from "./companies.js";

// ===== plugins =====
export const plugins = pgTable("plugins", {
  id: id,
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: text("version").notNull(),
  entrypoint: text("entrypoint").notNull(),
  manifest: jsonb("manifest"),
  enabled: boolean("enabled").notNull().default(true),
  ...timestamps,
});

// ===== plugin_config =====
export const pluginConfig = pgTable(
  "plugin_config",
  {
    id: id,
    pluginId: uuid("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    config: jsonb("config").default({}),
    ...timestamps,
  },
  (table) => [uniqueIndex("uq_plugin_config").on(table.pluginId)],
);

// ===== plugin_state (K-V store) =====
export const pluginState = pgTable(
  "plugin_state",
  {
    id: id,
    pluginId: uuid("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value"),
    ...timestamps,
  },
  (table) => [uniqueIndex("uq_plugin_state_key").on(table.pluginId, table.key)],
);

// ===== plugin_jobs =====
export const pluginJobs = pgTable("plugin_jobs", {
  id: id,
  pluginId: uuid("plugin_id")
    .notNull()
    .references(() => plugins.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  schedule: text("schedule"),
  payload: jsonb("payload"),
  status: text("status").notNull().default("active"),
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  ...timestamps,
});
