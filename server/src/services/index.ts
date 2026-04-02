// server/src/services/index.ts
import type { Database } from "@letro/db/client";
import type { Config } from "../config.js";
import type { Logger } from "pino";
import { IdeaService } from "./idea.service.js";
import { CompanyService } from "./company.service.js";
import { AgentService } from "./agent.service.js";
import { GoalService } from "./goal.service.js";
import { IssueService } from "./issue.service.js";
import { ProjectService } from "./project.service.js";
import { ActivityLogService } from "./activity-log.service.js";
import { HeartbeatService } from "./heartbeat.service.js";
import { ProgressReporter } from "./autonomy/progress-reporter.js";
import { ErrorTranslator } from "./autonomy/error-translator.js";
import { TaskDecompositionEngine } from "./autonomy/task-decomposition-engine.js";
import { TeamLeaderLoop } from "./autonomy/team-leader-loop.js";
import { HiringEngine } from "./autonomy/hiring-engine.js";
import { FiringEngine } from "./autonomy/firing-engine.js";
import { AutoRestartEngine } from "./autonomy/auto-restart-engine.js";
import { AutonomyConfigService } from "./autonomy/autonomy-config.js";
import { CostService } from "./cost.service.js";
import { BudgetService } from "./budget.service.js";
import { CostAnomalyDetector } from "./autonomy/cost-anomaly-detector.js";
import { PeerReviewEngine } from "./autonomy/peer-review-engine.js";
import { DashboardService } from "./dashboard.service.js";
import { WorkspaceService } from "./workspace.service.js";
import { SecretService } from "./secret.service.js";

export interface ServiceContainer {
  idea: IdeaService;
  company: CompanyService;
  agent: AgentService;
  goal: GoalService;
  issue: IssueService;
  project: ProjectService;
  activityLog: ActivityLogService;
  heartbeat: HeartbeatService;
  progressReporter: ProgressReporter;
  errorTranslator: ErrorTranslator;
  taskDecomposition: TaskDecompositionEngine;
  teamLeaderLoop: TeamLeaderLoop;
  hiringEngine: HiringEngine;
  firingEngine: FiringEngine;
  autoRestartEngine: AutoRestartEngine;
  autonomyConfig: AutonomyConfigService;
  cost: CostService;
  budget: BudgetService;
  costAnomalyDetector: CostAnomalyDetector;
  peerReviewEngine: PeerReviewEngine;
  dashboard: DashboardService;
  workspace: WorkspaceService;
  secret: SecretService;
}

export interface ServiceDependencies {
  db: Database;
  config: Config;
  logger: Logger;
}

export function createServiceContainer(deps: ServiceDependencies): ServiceContainer {
  const workspace = new WorkspaceService(deps);
  const cost = new CostService(deps);
  const budget = new BudgetService(deps, cost.getWindowSpend.bind(cost));
  const dashboard = new DashboardService(deps, cost.getWindowSpend.bind(cost), budget);
  const secret = new SecretService(deps);
  const heartbeat = new HeartbeatService(deps);
  heartbeat.setWorkspaceService(workspace);
  heartbeat.setSecretService(secret);

  return {
    idea: new IdeaService(deps),
    company: new CompanyService(deps),
    agent: new AgentService(deps),
    goal: new GoalService(deps),
    issue: new IssueService(deps),
    project: new ProjectService(deps),
    activityLog: new ActivityLogService(deps),
    heartbeat,
    progressReporter: new ProgressReporter(),
    errorTranslator: new ErrorTranslator(),
    taskDecomposition: new TaskDecompositionEngine(deps),
    teamLeaderLoop: new TeamLeaderLoop(deps),
    hiringEngine: new HiringEngine(deps),
    firingEngine: new FiringEngine(deps),
    autoRestartEngine: new AutoRestartEngine(deps),
    autonomyConfig: new AutonomyConfigService(deps),
    cost,
    budget,
    costAnomalyDetector: new CostAnomalyDetector(deps),
    peerReviewEngine: new PeerReviewEngine(deps),
    dashboard,
    workspace,
    secret,
  };
}
