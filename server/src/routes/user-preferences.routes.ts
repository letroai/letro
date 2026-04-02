// server/src/routes/user-preferences.routes.ts
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { userPreferences } from "@letro/db/schema";
import type { AppBindings, Actor } from "../env.js";

export const userPreferencesRoutes = new Hono<AppBindings>();

function getUserId(actor: Actor): string | null {
  switch (actor.kind) {
    case "local_trusted":
      return "local-user";
    case "user":
      return actor.userId;
    default:
      return null;
  }
}

// GET /api/user/preferences
userPreferencesRoutes.get("/user/preferences", async (c) => {
  const userId = getUserId(c.get("actor"));
  if (!userId) return c.json(null, 401);

  const db = c.get("db");
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return c.json(
    prefs ?? { userId, theme: "system", lastProjectId: null },
  );
});

// PATCH /api/user/preferences
userPreferencesRoutes.patch("/user/preferences", async (c) => {
  const userId = getUserId(c.get("actor"));
  if (!userId) return c.json(null, 401);

  const body = await c.req.json<{
    theme?: string;
    lastProjectId?: string | null;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.theme !== undefined) updates.theme = body.theme;
  if (body.lastProjectId !== undefined) updates.lastProjectId = body.lastProjectId;

  const db = c.get("db");
  const [prefs] = await db
    .insert(userPreferences)
    .values({ userId, ...updates })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: updates,
    })
    .returning();

  return c.json(prefs);
});
