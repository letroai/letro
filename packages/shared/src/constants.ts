// packages/shared/src/constants.ts

// ===== Agent Statuses =====
export const AGENT_STATUSES = ["idle", "working", "paused", "terminated"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

// ===== Team Roles =====
export const TEAM_ROLES = ["leader", "member"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

// ===== Member Types =====
export const MEMBER_TYPES = [
  "coder",
  "researcher",
  "reviewer",
  "specialist",
  "qa",
] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

// ===== Issue Statuses =====
export const ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

// ===== Issue Origin Kinds =====
export const ISSUE_ORIGIN_KINDS = [
  "manual",
  "auto_generated",
  "exploration",
  "decomposition",
] as const;
export type IssueOriginKind = (typeof ISSUE_ORIGIN_KINDS)[number];

// ===== Autonomy Levels =====
export const AUTONOMY_LEVEL_NAMES = ["manual", "confirm", "notify", "auto"] as const;
export type AutonomyLevelName = (typeof AUTONOMY_LEVEL_NAMES)[number];

/** Autonomy level numeric values */
export const AUTONOMY_LEVELS = {
  MANUAL: 1,
  CONFIRM: 2,
  NOTIFY: 3,
  AUTO: 4,
} as const;
export type AutonomyLevelValue = (typeof AUTONOMY_LEVELS)[keyof typeof AUTONOMY_LEVELS];

// ===== Idle Behaviors =====
export const IDLE_BEHAVIORS = ["wait", "explore"] as const;
export type IdleBehavior = (typeof IDLE_BEHAVIORS)[number];

// ===== Goal Statuses =====
export const GOAL_STATUSES = [
  "draft",
  "active",
  "completed",
  "cancelled",
  "paused",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// ===== Decomposition Strategies =====
export const DECOMPOSITION_STRATEGIES = [
  "balanced",
  "depth_first",
  "breadth_first",
] as const;
export type DecompositionStrategy = (typeof DECOMPOSITION_STRATEGIES)[number];

// ===== Heartbeat Run Statuses =====
export const HEARTBEAT_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
] as const;
export type HeartbeatRunStatus = (typeof HEARTBEAT_RUN_STATUSES)[number];

// ===== Peer Review Verdicts =====
export const PEER_REVIEW_VERDICTS = [
  "pending",
  "approved",
  "needs_revision",
  "rejected",
] as const;
export type PeerReviewVerdict = (typeof PEER_REVIEW_VERDICTS)[number];

// ===== Peer Review Types =====
export const PEER_REVIEW_TYPES = [
  "code_review",
  "task_review",
  "performance",
] as const;
export type PeerReviewType = (typeof PEER_REVIEW_TYPES)[number];

// ===== Issue Priorities =====
export const ISSUE_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

// ===== Agent Capability Keys =====
export const CAPABILITY_KEYS = [
  "hire_agent",
  "fire_agent",
  "create_task",
  "approve_task",
  "modify_budget",
  "explore",
] as const;
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

// ===== Task Generation Rule Types =====
export const TASK_GENERATION_RULE_TYPES = [
  "decomposition",
  "recurring",
  "reactive",
] as const;
export type TaskGenerationRuleType = (typeof TASK_GENERATION_RULE_TYPES)[number];

// ===== Assignee Strategies =====
export const ASSIGNEE_STRATEGIES = [
  "auto",
  "round_robin",
  "least_loaded",
  "specific",
] as const;
export type AssigneeStrategy = (typeof ASSIGNEE_STRATEGIES)[number];

// ===== Exploration Session Statuses =====
export const EXPLORATION_SESSION_STATUSES = ["active", "completed", "aborted"] as const;
export type ExplorationSessionStatus = (typeof EXPLORATION_SESSION_STATUSES)[number];

// ===== Exploration Trigger Reasons =====
export const EXPLORATION_TRIGGER_REASONS = ["idle", "goal_scan", "proactive"] as const;
export type ExplorationTriggerReason = (typeof EXPLORATION_TRIGGER_REASONS)[number];

// ===== Budget Policy Scopes =====
export const BUDGET_SCOPE_TYPES = ["company", "project", "agent"] as const;
export type BudgetScopeType = (typeof BUDGET_SCOPE_TYPES)[number];

// ===== Budget Cap Actions =====
export const SOFT_CAP_ACTIONS = ["notify", "slow_down", "pause"] as const;
export type SoftCapAction = (typeof SOFT_CAP_ACTIONS)[number];

export const HARD_CAP_ACTIONS = ["notify_and_pause", "notify_only", "hard_stop"] as const;
export type HardCapAction = (typeof HARD_CAP_ACTIONS)[number];

// ===== Budget Resolution Policies =====
export const BUDGET_RESOLUTION_POLICIES = [
  "auto_increase",
  "notify_and_wait",
  "redistribute",
] as const;
export type BudgetResolutionPolicy = (typeof BUDGET_RESOLUTION_POLICIES)[number];

// ===== Approval Statuses =====
export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
  "expired",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// ===== Onboarding Session Statuses =====
export const ONBOARDING_SESSION_STATUSES = [
  "idea_input",
  "structuring",
  "plan_review",
  "connecting",
  "completed",
] as const;
export type OnboardingSessionStatus = (typeof ONBOARDING_SESSION_STATUSES)[number];

// ===== User Idea Statuses =====
export const USER_IDEA_STATUSES = [
  "pending",
  "structuring",
  "structured",
  "activated",
] as const;
export type UserIdeaStatus = (typeof USER_IDEA_STATUSES)[number];

// ===== OAuth Connection Statuses =====
export const OAUTH_CONNECTION_STATUSES = ["active", "expired", "revoked"] as const;
export type OAuthConnectionStatus = (typeof OAUTH_CONNECTION_STATUSES)[number];

// ===== OAuth Providers =====
export const OAUTH_PROVIDERS = ["github", "google", "slack", "anthropic"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

// ===== Live Event Types =====
export const LIVE_EVENT_TYPES = [
  "agent:created",
  "agent:updated",
  "agent:deleted",
  "agent:hired",
  "agent:fired",
  "agent:status_changed",
  "issue:created",
  "issue:updated",
  "issue:status_changed",
  "issue:assigned",
  "goal:created",
  "goal:updated",
  "goal:progress_changed",
  "project:created",
  "project:updated",
  "heartbeat:started",
  "heartbeat:completed",
  "heartbeat:failed",
  "cost:event",
  "budget:warning",
  "budget:exceeded",
  "exploration:started",
  "exploration:completed",
  "peer_review:requested",
  "peer_review:completed",
  "approval:requested",
  "approval:resolved",
  "onboarding:step_changed",
] as const;
export type LiveEventType = (typeof LIVE_EVENT_TYPES)[number];

// ===== Activity Log Kinds =====
export const ACTIVITY_LOG_KINDS = [
  "agent_created",
  "agent_hired",
  "agent_fired",
  "agent_status_changed",
  "issue_created",
  "issue_updated",
  "issue_status_changed",
  "issue_assigned",
  "goal_created",
  "goal_updated",
  "goal_completed",
  "project_created",
  "heartbeat_started",
  "heartbeat_completed",
  "heartbeat_failed",
  "cost_event",
  "budget_warning",
  "budget_exceeded",
  "exploration_started",
  "exploration_completed",
  "peer_review_created",
  "peer_review_completed",
  "approval_created",
  "approval_resolved",
  "task_auto_generated",
  "task_decomposed",
  "autonomy_level_changed",
  "config_changed",
] as const;
export type ActivityLogKind = (typeof ACTIVITY_LOG_KINDS)[number];

// ===== Deployment Modes =====
export const DEPLOYMENT_MODES = ["local_machine", "docker", "cloud"] as const;
export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];

// ===== Auth Modes =====
export const AUTH_MODES = ["local_trusted", "authenticated"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

// ===== API Path Constants =====
export const API = {
  HEALTH: "/api/health",
  IDEAS: "/api/ideas",
  ONBOARDING: "/api/onboarding",
  CONNECTIONS: "/api/connections",
  COMPANIES: "/api/companies",
  AGENTS: "/api/agents",
  GOALS: "/api/goals",
  ISSUES: "/api/issues",
  PROJECTS: "/api/projects",
  COSTS: "/api/costs",
  BUDGETS: "/api/budgets",
  APPROVALS: "/api/approvals",
  DASHBOARD: "/api/dashboard",
  ACTIVITY: "/api/activity",
  PEER_REVIEWS: "/api/peer-reviews",
  AUTONOMY: "/api/autonomy",
  AUTH: "/api/auth",
} as const;
