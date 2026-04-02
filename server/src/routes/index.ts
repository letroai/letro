// server/src/routes/index.ts
import type { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { healthRoutes } from "./health.js";
import { ideaRoutes } from "./idea.routes.js";
import { oauthRoutes } from "./oauth.routes.js";
import { companyRoutes } from "./company.routes.js";
import { agentRoutes } from "./agent.routes.js";
import { goalRoutes } from "./goal.routes.js";
import { issueRoutes } from "./issue.routes.js";
import { projectRoutes } from "./project.routes.js";
import { costRoutes } from "./cost.routes.js";
import { budgetRoutes } from "./budget.routes.js";
import { peerReviewRoutes } from "./peer-review.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { authRoutes } from "./auth.routes.js";
import { aiToolsRoutes } from "./ai-tools.routes.js";
import { projectScopeRoutes } from "./project-scope.routes.js";
import { userPreferencesRoutes } from "./user-preferences.routes.js";
import { secretRoutes } from "./secret.routes.js";

export function registerRoutes(app: Hono<AppBindings>) {
  app.route("/api", authRoutes);
  app.route("/api", aiToolsRoutes);
  app.route("/api", projectScopeRoutes);
  app.route("/api", healthRoutes);
  app.route("/api", ideaRoutes);
  app.route("/api", oauthRoutes);
  app.route("/api", companyRoutes);
  app.route("/api", agentRoutes);
  app.route("/api", goalRoutes);
  app.route("/api", issueRoutes);
  app.route("/api", projectRoutes);
  app.route("/api", costRoutes);
  app.route("/api", budgetRoutes);
  app.route("/api", peerReviewRoutes);
  app.route("/api", dashboardRoutes);
  app.route("/api", userPreferencesRoutes);
  app.route("/api", secretRoutes);

  // Stub routes: not yet implemented but called by the frontend
  app.get("/api/notifications", (c) => c.json([]));
  app.get("/api/companies/:companyId/notifications", (c) => c.json([]));
}
