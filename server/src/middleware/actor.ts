// server/src/middleware/actor.ts
import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env.js";
import type { Actor } from "../env.js";
import { companies } from "@letro/db/schema";

// Cache default company ID in local_trusted mode (avoid DB lookup on every request)
let cachedDefaultCompanyId: string | null = null;

export function actorMiddleware() {
  return createMiddleware<AppBindings>(async (c, next) => {
    const config = c.get("config");

    if (config.authMode === "local_trusted") {
      // Lookup and cache the default company ID once
      if (!cachedDefaultCompanyId) {
        const db = c.get("db");
        const [defaultCompany] = await db.select({ id: companies.id }).from(companies).limit(1);
        if (defaultCompany) {
          cachedDefaultCompanyId = defaultCompany.id;
        } else {
          // Create default company if none exists
          const [newCompany] = await db
            .insert(companies)
            .values({
              name: "My Workspace",
              slug: "default",
              defaultAutonomyLevel: 4,
              autoHireEnabled: true,
              autoFireEnabled: false,
              explorationEnabled: true,
              peerReviewRequired: false,
            })
            .returning({ id: companies.id });
          cachedDefaultCompanyId = newCompany!.id;
        }
      }

      const actor: Actor = {
        kind: "local_trusted",
        companyId: cachedDefaultCompanyId,
      };
      c.set("actor", actor);
      await next();
      return;
    }

    // authenticated mode (to be implemented in Phase 2)
    const agentKey = c.req.header("X-Agent-Key");
    if (agentKey) {
      const actor: Actor = { kind: "anonymous" };
      c.set("actor", actor);
      await next();
      return;
    }

    const actor: Actor = { kind: "anonymous" };
    c.set("actor", actor);
    await next();
  });
}
