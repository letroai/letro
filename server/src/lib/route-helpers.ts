// server/src/lib/route-helpers.ts
// Shared helper functions for route handlers.

import type { Actor } from "../env.js";

/** Extracts companyId from actor, returns null if not available. */
export function getCompanyId(actor: Actor): string | null {
  return "companyId" in actor ? (actor.companyId ?? null) : null;
}

/** Extracts userId from actor. Returns "local-user" for local_trusted mode. */
export function getUserId(actor: Actor): string {
  if (actor.kind === "user") return actor.userId;
  return "local-user";
}
