import { execSync, spawn } from "node:child_process";
import type {
  ServerAdapterModule,
  AdapterStartParams,
  AdapterRunHandle,
  AdapterRunResult,
} from "./types.js";

const MAX_STDOUT_BYTES = 102_400; // 100KB (Claude Code can produce long output)
const MAX_STDERR_BYTES = 10_240; // 10KB
const RESULT_TRUNCATE_BYTES = 10_240; // Truncate to 10KB when returning results
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Claude Code (Local) adapter.
 *
 * Runs the `claude` CLI (Claude Code) in non-interactive mode.
 */
export class ClaudeLocalAdapter implements ServerAdapterModule {
  readonly id = "claude_local" as const;
  readonly displayName = "Claude Code (Local)";

  async start(params: AdapterStartParams): Promise<AdapterRunHandle> {
    const { agent, env, workspacePath, issue, autonomyContext } = params;

    // Build Claude Code CLI prompt
    const prompt = buildClaudePrompt(agent, issue, autonomyContext);

    // Environment variables
    const processEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...env,
      ANTHROPIC_API_KEY:
        env["ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"] ?? "",
    };

    const startTime = Date.now();

    // Execute Claude Code CLI
    // claude --print: Non-interactive mode, output result to stdout
    // --dangerously-skip-permissions: Skip permission checks for autonomous execution
    const child = spawn(
      "claude",
      [
        "--print",
        "--dangerously-skip-permissions",
        "--output-format",
        "json",
        "--max-turns",
        "50",
        prompt,
      ],
      {
        cwd: workspacePath,
        env: processEnv,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: TIMEOUT_MS,
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_STDOUT_BYTES)
        stdout = stdout.slice(-MAX_STDOUT_BYTES);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_STDERR_BYTES)
        stderr = stderr.slice(-MAX_STDERR_BYTES);
    });

    return {
      pid: child.pid,

      wait(): Promise<AdapterRunResult> {
        return new Promise((resolve) => {
          child.on("close", (code) => {
            // Attempt to parse token usage from Claude Code JSON output
            const tokenUsage = parseTokenUsage(stdout);
            const changedFiles = parseChangedFiles(stdout);

            resolve({
              status: code === 0 ? "succeeded" : "failed",
              exitCode: code ?? 1,
              stdout: stdout.slice(0, RESULT_TRUNCATE_BYTES),
              stderr,
              changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
              tokenUsage,
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
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 5_000);
        }
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    // Check if claude CLI is installed
    try {
      execSync("claude --version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildClaudePrompt(
  agent: AdapterStartParams["agent"],
  issue: AdapterStartParams["issue"],
  _autonomyContext: AdapterStartParams["autonomyContext"],
): string {
  let prompt = agent.instructions + "\n\n";

  if (issue) {
    prompt += `## Current Task\n\n`;
    prompt += `Title: ${issue.title}\n`;
    prompt += `Description: ${issue.description}\n\n`;
    prompt += `Complete this task. Write the necessary code and test it.\n`;
    prompt += `Commit your changes when done.\n`;
  }

  return prompt;
}

function parseTokenUsage(
  stdout: string,
): { input_tokens: number; output_tokens: number } | undefined {
  try {
    const lines = stdout.split("\n");
    for (const line of lines) {
      try {
        const json = JSON.parse(line) as {
          usage?: { input_tokens?: number; output_tokens?: number };
        };
        if (json.usage) {
          return {
            input_tokens: json.usage.input_tokens ?? 0,
            output_tokens: json.usage.output_tokens ?? 0,
          };
        }
      } catch {
        /* Each line may not be JSON */
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function parseChangedFiles(stdout: string): string[] {
  const files: string[] = [];
  try {
    const lines = stdout.split("\n");
    for (const line of lines) {
      try {
        const json = JSON.parse(line) as {
          tool?: string;
          file_path?: string;
          path?: string;
        };
        if (json.tool === "Write" || json.tool === "Edit") {
          const filePath = json.file_path ?? json.path ?? "";
          if (filePath) files.push(filePath);
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return files;
}
