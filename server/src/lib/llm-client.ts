// server/src/lib/llm-client.ts
// Calls LLM via Claude CLI.

import { execFile, spawn } from "child_process";
import { promisify } from "util";

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
  const model = options.model ?? "sonnet";
  args.push("--model", model);

  if (options.system) {
    args.push("--system-prompt", options.system);
  }

  args.push(options.prompt);

  try {
    const { stdout } = await execFileAsync("claude", args, {
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });

    return { content: stripMarkdownCodeBlock(stdout.trim()) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Claude CLI invocation failed: ${message}`);
  }
}

/**
 * Calls Claude CLI with real-time streaming via spawn.
 * Each stdout chunk is forwarded to the onChunk callback.
 */
export function callLLMStreaming(
  options: LLMCallOptions,
  onChunk: (chunk: string) => void,
): Promise<LLMResponse> {
  return new Promise((resolve, reject) => {
    const args = ["--print"];
    const model = options.model ?? "sonnet";
    args.push("--model", model);

    if (options.system) {
      args.push("--system-prompt", options.system);
    }

    args.push(options.prompt);

    const child = spawn("claude", args, {
      timeout: 120_000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      onChunk(text);
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ content: stripMarkdownCodeBlock(stdout.trim()) });
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
