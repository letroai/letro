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

/** Formats a human-readable label for a Claude tool call. */
function formatToolLabel(toolName: string, inputJson: string): string {
  try {
    const input = JSON.parse(inputJson);
    switch (toolName) {
      case "Write": {
        const p = input.file_path ?? "";
        const name = p.split("/").pop() ?? p;
        return `\n📝 ${name}\n`;
      }
      case "Edit": {
        const p = input.file_path ?? "";
        const name = p.split("/").pop() ?? p;
        return `\n✏️ ${name}\n`;
      }
      case "Bash": {
        const cmd = String(input.command ?? "").slice(0, 60);
        return `\n💻 ${cmd}\n`;
      }
      case "Read": {
        const p = input.file_path ?? "";
        const name = p.split("/").pop() ?? p;
        return `\n📖 ${name}\n`;
      }
      case "Glob":
        return `\n🔍 ${input.pattern ?? ""}\n`;
      case "Grep":
        return `\n🔍 ${input.pattern ?? ""}\n`;
      default:
        return "";
    }
  } catch {
    return "";
  }
}

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
    // Track current tool_use block to suppress json_delta noise
    let currentToolName = "";
    let currentToolInputJson = "";

    child.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);

          if (obj.type === "stream_event") {
            const evt = obj.event;
            if (!evt) continue;

            // Tool call starts — show label, suppress subsequent json deltas
            if (evt.type === "content_block_start" && evt.content_block?.type === "tool_use") {
              currentToolName = evt.content_block.name ?? "";
              currentToolInputJson = "";
            }

            if (evt.type === "content_block_delta") {
              const delta = evt.delta;
              if (delta?.type === "text_delta" && delta.text) {
                // Normal text output — show to user
                fullText += delta.text;
                onChunk(delta.text);
              } else if (delta?.type === "input_json_delta") {
                // Tool input JSON chunk — accumulate silently (don't show raw json)
                currentToolInputJson += delta.partial_json ?? "";
              }
            }

            // Tool call done — extract file path and show a clean label
            if (evt.type === "content_block_stop" && currentToolName) {
              const label = formatToolLabel(currentToolName, currentToolInputJson);
              if (label) {
                fullText += label;
                onChunk(label);
              }
              currentToolName = "";
              currentToolInputJson = "";
            }
          }

          // Tool execution result
          if (obj.type === "user" && obj.tool_use_result) {
            const r = obj.tool_use_result;
            let label = "";
            if (r.type === "create" && r.filePath) {
              label = `  ✅\n`;
            } else if (r.type === "update" && r.filePath) {
              label = `  ✅\n`;
            }
            if (label) {
              fullText += label;
              onChunk(label);
            }
          }

          // Final result text
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
