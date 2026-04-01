// server/src/lib/defaults.ts
// Centralized system defaults and magic numbers.
// All hardcoded values across services should reference these constants.

// ===== LLM Pricing (cents per 1K tokens) =====
export const LLM_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 0.3, output: 1.5 },
  "claude-opus-4-20250514": { input: 1.5, output: 7.5 },
  "claude-haiku-3-20250514": { input: 0.025, output: 0.125 },
};
export const DEFAULT_LLM_MODEL = "claude-sonnet-4-20250514";

// ===== Budget Defaults =====
export const DEFAULT_BUDGET_CENTS = 10_000; // $100
export const DEFAULT_SOFT_CAP_PERCENT = 80;
export const DEFAULT_HARD_CAP_PERCENT = 100;
export const BUDGET_INCREASE_FACTOR = 1.2; // 20% increase

// ===== Autonomy Timing =====
export const MIN_HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const HIRING_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
export const FIRING_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour
export const CASCADE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const WS_PING_INTERVAL_MS = 30_000; // 30 seconds
export const JWT_EXPIRY_SECONDS = 60 * 60; // 1 hour

// ===== System Limits =====
export const MAX_AGENTS_PER_COMPANY = 20;
export const MAX_TASKS_PER_CYCLE = 5;
export const MAX_HIRES_PER_CYCLE = 3;
export const MAX_FIRES_PER_CYCLE = 1;
export const CONSECUTIVE_FAILURE_THRESHOLD = 3;

// ===== Thresholds =====
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.5;
export const COST_SPIKE_MULTIPLIER = 5;
export const FAILURE_RATE_THRESHOLD = 0.5;
export const CASCADE_EVENT_COUNT = 10;

// ===== Adapter Defaults =====
export const DEFAULT_ADAPTER_ID = "claude_local";
export const MAX_STDOUT_BYTES = 102_400; // 100KB
export const MAX_STDERR_BYTES = 10_240; // 10KB
export const RESULT_TRUNCATE_BYTES = 10_240; // 10KB
export const ADAPTER_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const CLAUDE_MAX_TURNS = 50;

// ===== Leader Agent Defaults =====
export const LEADER_DEFAULT_INSTRUCTIONS = `당신은 프로젝트 팀장입니다.
당신의 역할:
1. 목표를 분석하여 구체적인 태스크로 분해합니다.
2. 적절한 팀원을 고용하고, 태스크를 할당합니다.
3. 팀원의 작업 결과를 확인하고 다음 단계를 결정합니다.
4. 비효율적인 팀원을 해고하고 팀을 최적화합니다.

당신은 직접 코드를 작성하거나 태스크를 실행하지 않습니다.
오직 관리와 조율에만 집중합니다.`;

// ===== Logger Level Convention =====
// logger.error — Unrecoverable errors (system crash, data corruption)
// logger.warn  — Recoverable issues (agent terminated, budget exceeded, auth failure)
// logger.info  — Normal operations (service started, request completed, agent hired)
// logger.debug — Detailed diagnostics (query results, intermediate calculations)
