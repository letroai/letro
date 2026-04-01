// server/src/routes/ai-tools.routes.ts
import { Hono } from "hono";
import type { AppBindings } from "../env.js";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const aiToolsRoutes = new Hono<AppBindings>();

interface AITool {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  version: string | null;
  setupGuide: string;
}

const KNOWN_TOOLS: Array<{
  id: string;
  name: string;
  description: string;
  command: string;
  versionArgs: string[];
  setupGuide: string;
}> = [
  {
    id: "claude_code",
    name: "Claude Code",
    description: "Anthropic's AI coding assistant (recommended)",
    command: "claude",
    versionArgs: ["--version"],
    setupGuide: "npm install -g @anthropic-ai/claude-code && claude login",
  },
  {
    id: "gemini_cli",
    name: "Gemini CLI",
    description: "Google's AI coding assistant",
    command: "gemini",
    versionArgs: ["--version"],
    setupGuide: "npm install -g @anthropic-ai/gemini-cli && gemini auth",
  },
  {
    id: "codex_cli",
    name: "OpenAI Codex CLI",
    description: "OpenAI's AI coding assistant",
    command: "codex",
    versionArgs: ["--version"],
    setupGuide: "npm install -g @openai/codex && codex login",
  },
  {
    id: "aider",
    name: "Aider",
    description: "Open-source AI pair programming tool",
    command: "aider",
    versionArgs: ["--version"],
    setupGuide: "pip install aider-chat && export ANTHROPIC_API_KEY=your_key",
  },
];

async function checkTool(tool: (typeof KNOWN_TOOLS)[number]): Promise<AITool> {
  try {
    const { stdout } = await execFileAsync(tool.command, tool.versionArgs, {
      timeout: 5000,
    });
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      installed: true,
      version: stdout.trim().split("\n")[0] ?? null,
      setupGuide: tool.setupGuide,
    };
  } catch {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      installed: false,
      version: null,
      setupGuide: tool.setupGuide,
    };
  }
}

// GET /api/ai-tools — List available AI tools
aiToolsRoutes.get("/ai-tools", async (c) => {
  const results = await Promise.all(KNOWN_TOOLS.map(checkTool));
  const available = results.filter((t) => t.installed);

  return c.json({
    tools: results,
    availableCount: available.length,
    ready: available.length > 0,
    recommended: available.find((t) => t.id === "claude_code") ?? available[0] ?? null,
  });
});
