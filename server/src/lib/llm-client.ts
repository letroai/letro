// server/src/lib/llm-client.ts
// Calls LLM via Claude CLI.

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface LLMCallOptions {
  system?: string;
  prompt: string;
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
 * Strips markdown code block wrappers (```json ... ```) that Claude sometimes adds when returning JSON.
 */
function stripMarkdownCodeBlock(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` patterns
  const match = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  if (match?.[1]) return match[1];
  return text;
}
