/**
 * Adapter interface definitions.
 *
 * Types that all adapters (agent execution environments) must implement.
 */

/**
 * Interface that all adapters must implement.
 * Abstracts the actual execution environment for agents.
 */
export interface ServerAdapterModule {
  /** Adapter unique identifier */
  readonly id: string;

  /** Human-readable name */
  readonly displayName: string;

  /**
   * Starts an agent process.
   * @returns Run handle. Can be cancelled via cancel().
   */
  start(params: AdapterStartParams): Promise<AdapterRunHandle>;

  /**
   * Checks if this adapter is available on the current system.
   * (e.g. whether Claude CLI is installed)
   */
  isAvailable(): Promise<boolean>;
}

export interface AdapterStartParams {
  /** heartbeat_runs.id */
  runId: string;

  /** Agent configuration */
  agent: {
    id: string;
    name: string;
    instructions: string;
    adapter_config: Record<string, unknown>;
  };

  /** Issue context (if available) */
  issue?: {
    id: string;
    title: string;
    description: string;
  } | undefined;

  /** Environment variables (including secrets) */
  env: Record<string, string>;

  /** Workspace path */
  workspacePath: string;

  /** Agent JWT (for API callbacks) */
  agentJwt: string;

  /** Server callback URL */
  serverUrl: string;

  /** Autonomy context */
  autonomyContext: {
    level: number;
    capabilities: string[];
    budget_remaining_cents: number;
    auto_approved: boolean;
  };
}

export interface AdapterRunHandle {
  /** PID of running process (if available) */
  pid?: number | undefined;

  /**
   * Waits for execution to complete. Returns result.
   */
  wait(): Promise<AdapterRunResult>;

  /**
   * Force cancels execution.
   */
  cancel(): Promise<void>;
}

export interface AdapterRunResult {
  /** Success/failure */
  status: "succeeded" | "failed";

  /** Exit code */
  exitCode: number;

  /** stdout output (max 10KB) */
  stdout: string;

  /** stderr output (max 10KB) */
  stderr: string;

  /** Changed file list */
  changedFiles?: string[] | undefined;

  /** Token usage (if reported) */
  tokenUsage?:
    | {
        input_tokens: number;
        output_tokens: number;
      }
    | undefined;

  /** Duration (ms) */
  durationMs: number;
}
