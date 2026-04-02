// server/src/lib/llm-client.ts
// Calls LLM via Claude CLI.

import { execFile, spawn } from "child_process";
import { promisify } from "util";
import {
  DEFAULT_LLM_MODEL_SHORT,
  LLM_SYNC_TIMEOUT_MS,
  LLM_STREAMING_TIMEOUT_MS,
} from "./defaults.js";

const execFileAsync = promisify(execFile);

export interface LLMCallOptions {
  system?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
}

/**
 * Calls Claude CLI and returns text response.
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  const args = ["--print"];

  // Use specified model or default to Sonnet
  const model = options.model ?? DEFAULT_LLM_MODEL_SHORT;
  args.push("--model", model);

  if (options.system) {
    args.push("--system-prompt", options.system);
  }

  args.push(options.prompt);

  try {
    const { stdout } = await execFileAsync("claude", args, {
      timeout: LLM_SYNC_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });

    return { content: stripMarkdownCodeBlock(stdout.trim()) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Claude CLI invocation failed: ${message}`);
  }
}

/**
 * Calls Claude CLI with real-time streaming via --output-format stream-json.
 * Parses content_block_delta events and forwards text chunks to onChunk.
 */
export function callLLMStreaming(
  options: LLMCallOptions,
  onChunk: (chunk: string) => void,
  spawnOptions?: { cwd?: string; env?: Record<string, string> },
): Promise<LLMResponse> {
  return new Promise((resolve, reject) => {
    const args = [
      "--print",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
    ];

    // When running in a workspace, enable file creation
    if (spawnOptions?.cwd) {
      args.push("--dangerously-skip-permissions");
    }

    const model = options.model ?? DEFAULT_LLM_MODEL_SHORT;
    args.push("--model", model);

    if (options.system) {
      args.push("--system-prompt", options.system);
    }

    args.push(options.prompt);

    const child = spawn("claude", args, {
      timeout: LLM_STREAMING_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: spawnOptions?.cwd,
      env: spawnOptions?.env
        ? { ...process.env, ...spawnOptions.env }
        : undefined,
    });

    let fullText = "";
    let stderr = "";
    let buffer = "";

    child.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      // Process complete JSON lines
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          // Extract streaming text from content_block_delta events
          if (obj.type === "stream_event" && obj.event?.type === "content_block_delta") {
            const text = obj.event.delta?.text;
            if (text) {
              fullText += text;
              onChunk(text);
            }
          }
          // Extract final result text
          if (obj.type === "result" && obj.result) {
            if (!fullText) fullText = obj.result;
          }
        } catch {
          // Skip malformed lines
        }
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ content: stripMarkdownCodeBlock(fullText.trim()) });
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 500)}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Claude CLI spawn failed: ${err.message}`));
    });
  });
}

/**
 * Strips markdown code block wrappers (```json ... ```) that Claude sometimes adds when returning JSON.
 */
function stripMarkdownCodeBlock(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` patterns
  const match = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  if (match?.[1]) return match[1];
  return text;
}
