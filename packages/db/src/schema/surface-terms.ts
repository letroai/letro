// packages/db/src/schema/surface-terms.ts
import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { id } from "./_helpers.js";

// ===== surface_term_mappings =====
export const surfaceTermMappings = pgTable(
  "surface_term_mappings",
  {
    id: id,
    internalTerm: text("internal_term").notNull(),
    surfaceTerm: text("surface_term").notNull(),
    locale: text("locale").notNull().default("ko"),
    context: text("context"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_surface_term").on(table.internalTerm, table.locale, table.context),
    index("idx_surface_terms_lookup").on(table.internalTerm, table.locale),
  ],
);
