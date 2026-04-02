// server/src/routes/idea.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreateIdeaSchema, ActivateIdeaSchema } from "@letro/shared/schemas/idea.schema";
import { HTTPException } from "hono/http-exception";

export const ideaRoutes = new Hono<AppBindings>();

function getCompanyId(actor: { kind: string; companyId?: string | null }): string {
  const id = "companyId" in actor ? actor.companyId : null;
  if (!id) throw new HTTPException(400, { message: "회사 정보를 찾을 수 없어요" });
  return id;
}

// POST /api/ideas
ideaRoutes.post("/ideas", async (c) => {
  const body = await c.req.json();
  const parsed = CreateIdeaSchema.parse(body);
  const actor = c.get("actor");
  const services = c.get("services");
  const companyId = getCompanyId(actor);
  const userId = actor.kind === "user" ? actor.userId : "local-user";
  const locale = (body as Record<string, unknown>).locale as string | undefined;
  const idea = await services.idea.create(companyId, userId, parsed.raw_text, locale);
  return c.json(idea, 201);
});

// GET /api/ideas/:id
ideaRoutes.get("/ideas/:id", async (c) => {
  const services = c.get("services");
  const idea = await services.idea.getById(c.req.param("id"));
  if (!idea) return c.json({ message: "아이디어를 찾을 수 없어요" }, 404);
  return c.json(idea);
});

// GET /api/ideas/:id/plan
ideaRoutes.get("/ideas/:id/plan", async (c) => {
  const services = c.get("services");
  const plan = await services.idea.getPlan(c.req.param("id"));
  return c.json(plan);
});

// POST /api/ideas/:id/activate
ideaRoutes.post("/ideas/:id/activate", async (c) => {
  const body = await c.req.json();
  ActivateIdeaSchema.parse(body);
  const actor = c.get("actor");
  const services = c.get("services");
  const userId = actor.kind === "user" ? actor.userId : "local-user";
  const project = await services.idea.activate(c.req.param("id"), userId);

  // Apply locale override if provided during review
  const localeOverride = (body as Record<string, unknown>).locale as string | undefined;
  if (localeOverride && (localeOverride === "ko" || localeOverride === "en")) {
    const currentSettings = (project.settings as Record<string, unknown>) ?? {};
    await services.project.update(project.id, { settings: { ...currentSettings, locale: localeOverride } });
  }

  const projectLocale = (localeOverride ?? ((project.settings as Record<string, unknown>)?.locale as string) ?? "en") as import("../lib/i18n.js").Locale;

  // Create workspace directory for the project
  const companyId = getCompanyId(actor);
  services.workspace
    .createForProject(companyId, project.id, project.name, project.description ?? undefined, projectLocale)
    .catch((err: unknown) => {
      c.get("logger").error({ projectId: project.id, err }, "Workspace creation failed");
    });

  // Fire-and-forget: trigger leader's first heartbeat to start creating tasks
  services.heartbeat
    .executeHeartbeat(project.leaderAgentId)
    .catch((err: unknown) => {
      const logger = c.get("logger");
      logger.error({ leaderId: project.leaderAgentId, err }, "Leader first heartbeat failed");
    });

  return c.json({ projectId: project.id, projectName: project.name }, 201);
});
