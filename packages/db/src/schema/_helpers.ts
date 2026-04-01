// packages/db/src/schema/_helpers.ts
import { uuid, timestamp } from "drizzle-orm/pg-core";

/** Timestamp columns applied to all tables */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** UUID PK column */
export const id = uuid("id").primaryKey().defaultRandom();
