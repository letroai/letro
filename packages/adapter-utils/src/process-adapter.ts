import { spawn } from "node:child_process";
import type {
  ServerAdapterModule,
  AdapterStartParams,
  AdapterRunHandle,
  AdapterRunResult,
} from "./types.js";

const MAX_OUTPUT_BYTES = 10_240; // 10KB

export interface ProcessAdapterOptions {
  /** Adapter unique id (default: "process") */
  id?: string | undefined;
  /** Human-readable name (default: "Process Adapter") */
  displayName?: string | undefined;
  /** Process timeout ms (default: 10 min) */
  timeoutMs?: number | undefined;
  /** Max stdout/stderr bytes (default: 10KB) */
  maxOutputBytes?: number | undefined;
}

/**
 * General-purpose process adapter.
 *
 * Executes arbitrary commands via Node.js child_process.spawn.
 * Command is obtained from agent.adapter_config.command / args.
 */
export class ProcessAdapter implements ServerAdapterModule {
  readonly id: string;
  readonly displayName: string;
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;

  constructor(options?: ProcessAdapterOptions) {
    this.id = options?.id ?? "process";
    this.displayName = options?.displayName ?? "Process Adapter";
    this.timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;
    this.maxOutputBytes = options?.maxOutputBytes ?? MAX_OUTPUT_BYTES;
  }

  async start(params: AdapterStartParams): Promise<AdapterRunHandle> {
    const { agent, env, workspacePath, agentJwt, serverUrl, issue } = params;

    // Get command from agent's adapter_config
    const command = (agent.adapter_config["command"] as string | undefined) ?? "node";
    const args = (agent.adapter_config["args"] as string[] | undefined) ?? [];

    // Configure environment variables
    const processEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...env,
      LETRO_AGENT_ID: agent.id,
      LETRO_AGENT_NAME: agent.name,
      LETRO_RUN_ID: params.runId,
      LETRO_SERVER_URL: serverUrl,
      LETRO_AGENT_JWT: agentJwt,
      LETRO_INSTRUCTIONS: agent.instructions,
    };

    // Inject issue context as environment variables if available
    if (issue) {
      processEnv["LETRO_ISSUE_ID"] = issue.id;
      processEnv["LETRO_ISSUE_TITLE"] = issue.title;
      processEnv["LETRO_ISSUE_DESCRIPTION"] = issue.description;
    }

    const maxBytes = this.maxOutputBytes;
    const startTime = Date.now();

    const child = spawn(command, args, {
      cwd: workspacePath,
      env: processEnv,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: this.timeoutMs,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > maxBytes) stdout = stdout.slice(-maxBytes);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > maxBytes) stderr = stderr.slice(-maxBytes);
    });

    return {
      pid: child.pid,

      wait(): Promise<AdapterRunResult> {
        return new Promise((resolve) => {
          child.on("close", (code) => {
            resolve({
              status: code === 0 ? "succeeded" : "failed",
              exitCode: code ?? 1,
              stdout,
              stderr,
              durationMs: Date.now() - startTime,
            });
          });

          child.on("error", (err: Error) => {
            resolve({
              status: "failed",
              exitCode: 1,
              stdout,
              stderr: stderr + "\n" + err.message,
              durationMs: Date.now() - startTime,
            });
          });
        });
      },

      async cancel(): Promise<void> {
        if (child.pid != null && !child.killed) {
          child.kill("SIGTERM");
          // SIGKILL if still alive after 5 seconds
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 5_000);
        }
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return true; // Process adapter is always available
  }
}
