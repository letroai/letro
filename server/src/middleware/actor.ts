// server/src/middleware/actor.ts
import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env.js";
import type { Actor } from "../env.js";
import { companies, companyMemberships, sessions, users } from "@letro/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAccessToken } from "../lib/user-jwt.js";

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

    // ===== authenticated mode =====

    // Agent key (inter-service calls from running agents)
    const agentKey = c.req.header("X-Agent-Key");
    if (agentKey) {
      // Agent JWT validation is handled in heartbeat routes separately.
      // Here we just mark as anonymous; heartbeat routes validate agentKey themselves.
      const actor: Actor = { kind: "anonymous" };
      c.set("actor", actor);
      await next();
      return;
    }

    // User access token (Bearer JWT)
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const payload = verifyAccessToken(token);
        const db = c.get("db");

        // Resolve the user's primary company
        const [membership] = await db
          .select({ companyId: companyMemberships.companyId })
          .from(companyMemberships)
          .where(eq(companyMemberships.userId, payload.sub))
          .limit(1);

        const actor: Actor = {
          kind: "user",
          userId: payload.sub,
          companyId: membership?.companyId ?? null,
        };
        c.set("actor", actor);
        await next();
        return;
      } catch {
        // Invalid or expired token — fall through to anonymous
      }
    }

    // Unauthenticated
    const actor: Actor = { kind: "anonymous" };
    c.set("actor", actor);
    await next();
  });
}
