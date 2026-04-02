// server/src/routes/issue.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import {
  CreateIssueSchema,
  UpdateIssueSchema,
  CheckoutIssueSchema,
  CreateCommentSchema,
  IssueListFiltersSchema,
} from "@letro/shared/schemas/issue.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const issueRoutes = new Hono<AppBindings>();

// GET /api/companies/:companyId/issues
issueRoutes.get("/companies/:companyId/issues", async (c) => {
  const services = c.get("services");
  const filters = IssueListFiltersSchema.parse(c.req.query());
  const result = await services.issue.list(c.req.param("companyId"), stripUndefined(filters));
  return c.json(result);
});

// GET /api/issues/:id
issueRoutes.get("/issues/:id", async (c) => {
  const services = c.get("services");
  const issue = await services.issue.getById(c.req.param("id"));
  if (!issue) return c.json({ message: "Task not found" }, 404);
  return c.json(issue);
});

// POST /api/companies/:companyId/issues
issueRoutes.post("/companies/:companyId/issues", async (c) => {
  const body = await c.req.json();
  const parsed = CreateIssueSchema.parse(body);
  const actor = c.get("actor");
  const services = c.get("services");
  const actorInfo = {
    agentId: actor.kind === "agent" ? actor.agentId : undefined,
    userId: actor.kind === "user" ? actor.userId : undefined,
  };
  const issue = await services.issue.create(c.req.param("companyId"), stripUndefined(parsed), stripUndefined(actorInfo));
  return c.json(issue, 201);
});

// PATCH /api/issues/:id
issueRoutes.patch("/issues/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateIssueSchema.parse(body);
  const services = c.get("services");
  const issue = await services.issue.update(c.req.param("id"), stripUndefined(parsed));
  return c.json(issue);
});

// DELETE /api/issues/:id
issueRoutes.delete("/issues/:id", async (c) => {
  const services = c.get("services");
  await services.issue.delete(c.req.param("id"));
  return c.body(null, 204);
});

// POST /api/issues/:id/checkout
issueRoutes.post("/issues/:id/checkout", async (c) => {
  const body = await c.req.json();
  const parsed = CheckoutIssueSchema.parse(body);
  const services = c.get("services");
  const issue = await services.issue.checkout(c.req.param("id"), parsed.agent_id);
  return c.json(issue);
});

// POST /api/issues/:id/release
issueRoutes.post("/issues/:id/release", async (c) => {
  const services = c.get("services");
  const issue = await services.issue.release(c.req.param("id"));
  return c.json(issue);
});

// POST /api/issues/:id/complete
issueRoutes.post("/issues/:id/complete", async (c) => {
  const services = c.get("services");
  const issue = await services.issue.complete(c.req.param("id"));
  return c.json(issue);
});

// GET /api/issues/:id/comments
issueRoutes.get("/issues/:id/comments", async (c) => {
  const services = c.get("services");
  const comments = await services.issue.listComments(c.req.param("id"));
  return c.json(comments);
});

// POST /api/issues/:id/comments
issueRoutes.post("/issues/:id/comments", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCommentSchema.parse(body);
  const services = c.get("services");
  const comment = await services.issue.addComment(c.req.param("id"), stripUndefined(parsed));
  return c.json(comment, 201);
});
