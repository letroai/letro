// server/src/routes/peer-review.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { CreatePeerReviewSchema, UpdatePeerReviewSchema } from "@letro/shared/schemas/peer-review.schema";
import { stripUndefined } from "../lib/strip-undefined.js";

export const peerReviewRoutes = new Hono<AppBindings>();

// POST /api/peer-reviews
peerReviewRoutes.post("/peer-reviews", async (c) => {
  const body = await c.req.json();
  const parsed = CreatePeerReviewSchema.parse(body);
  const actor = c.get("actor");
  const agentId = actor.kind === "agent" ? actor.agentId : "";
  const services = c.get("services");
  const review = await services.peerReviewEngine.requestReview(
    parsed.issue_id,
    agentId,
    parsed.run_id,
    parsed.review_type,
  );
  return c.json(review, 201);
});

// PATCH /api/peer-reviews/:id
peerReviewRoutes.patch("/peer-reviews/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdatePeerReviewSchema.parse(body);
  const actor = c.get("actor");
  const agentId = actor.kind === "agent" ? actor.agentId : "";
  const services = c.get("services");
  const review = await services.peerReviewEngine.submitReview(
    c.req.param("id"),
    agentId,
    parsed.verdict,
    parsed.score,
    parsed.feedback,
  );
  return c.json(review);
});
