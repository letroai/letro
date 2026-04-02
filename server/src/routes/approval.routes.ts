// server/src/routes/approval.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { getCompanyId, getUserId } from "../lib/route-helpers.js";

export const approvalRoutes = new Hono<AppBindings>();

// GET /api/approvals
approvalRoutes.get("/approvals", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json([]);
  const status = c.req.query("status") || undefined;
  const entityType = c.req.query("entityType") || undefined;
  const list = await c.get("services").approval.list(companyId, { status, entityType });
  return c.json(list);
});

// GET /api/approvals/pending/count
approvalRoutes.get("/approvals/pending/count", async (c) => {
  const companyId = getCompanyId(c.get("actor"));
  if (!companyId) return c.json({ count: 0 });
  const count = await c.get("services").approval.countPending(companyId);
  return c.json({ count });
});

// GET /api/approvals/:id
approvalRoutes.get("/approvals/:id", async (c) => {
  const approval = await c.get("services").approval.getById(c.req.param("id"));
  if (!approval) return c.json({ message: "확인 요청을 찾을 수 없어요" }, 404);
  return c.json(approval);
});

// POST /api/approvals/:id/approve
approvalRoutes.post("/approvals/:id/approve", async (c) => {
  const body = (await c.req.json<{ note?: string }>().catch(() => ({}))) as { note?: string };
  const userId = getUserId(c.get("actor"));
  const result = await c.get("services").approval.approve(c.req.param("id"), userId, body.note);
  return c.json(result);
});

// POST /api/approvals/:id/reject
approvalRoutes.post("/approvals/:id/reject", async (c) => {
  const body = (await c.req.json<{ note?: string }>().catch(() => ({}))) as { note?: string };
  const userId = getUserId(c.get("actor"));
  const result = await c.get("services").approval.reject(c.req.param("id"), userId, body.note);
  return c.json(result);
});

// POST /api/approvals/:id/revision
approvalRoutes.post("/approvals/:id/revision", async (c) => {
  const body = await c.req.json<{ note: string }>();
  if (!body.note) return c.json({ message: "수정 요청 내용이 필요해요" }, 400);
  const userId = getUserId(c.get("actor"));
  const result = await c.get("services").approval.requestRevision(c.req.param("id"), userId, body.note);
  return c.json(result);
});
