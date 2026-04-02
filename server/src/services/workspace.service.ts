// server/src/services/workspace.service.ts
import { eq } from "drizzle-orm";
import { executionWorkspaces } from "@letro/db/schema";
import { mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve, join, extname, relative } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import type { ServiceDependencies } from "./index.js";
import { ts, type Locale } from "../lib/i18n.js";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".claude", "__pycache__", ".next",
  ".turbo", "dist", ".embedded-pg", ".venv",
]);

const MAX_TREE_DEPTH = 6;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib",
  ".pdf", ".mp3", ".mp4", ".wav",
]);

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".py": "python", ".rs": "rust", ".go": "go", ".java": "java",
  ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
  ".md": "markdown", ".html": "html", ".css": "css", ".scss": "scss",
  ".sql": "sql", ".sh": "bash", ".bash": "bash",
  ".xml": "xml", ".svg": "xml", ".txt": "text",
  ".c": "c", ".cpp": "cpp", ".h": "c", ".hpp": "cpp",
  ".rb": "ruby", ".php": "php", ".swift": "swift", ".kt": "kotlin",
  ".vue": "vue", ".svelte": "svelte",
};

export class WorkspaceService {
  private db;
  private config;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.config = deps.config;
    this.logger = deps.logger;
  }

  /** Creates workspace directory and DB record for a project. */
  async createForProject(companyId: string, projectId: string, projectName?: string, projectDescription?: string, locale: Locale = "en"): Promise<{ id: string; path: string }> {
    const wsPath = resolve(this.config.workspacesDir, projectId);
    await mkdir(wsPath, { recursive: true });

    const L = (key: Parameters<typeof ts>[0]) => ts(key, locale);

    const claudeMd = `# ${L("workspaceRules")}

## ${L("requiredRules")}
- ${L("ruleFilesHere")}
- ${L("ruleNoOutside")}

## ${L("progressDoc")} → [PROGRESS.md](PROGRESS.md)
- ${L("ruleReadProgress")}
- ${L("ruleUpdateProgress")}
`;
    await writeFile(join(wsPath, "CLAUDE.md"), claudeMd, "utf-8");

    const name = projectName ?? (locale === "ko" ? "프로젝트" : "Project");
    const progressMd = `# ${name} ${L("progressTitle")}

## ${L("progressGoal")}
${projectDescription ?? L("progressNone")}

## ${L("progressCurrentState")}
- ${L("progressStarted")}
- ${L("progressNoTasks")}

## ${L("progressCompleted")}

${L("progressNone")}

## ${L("progressInProgress")}

${L("progressNone")}

## ${L("progressArchitecture")}

${L("progressNone")}

## ${L("progressFileStructure")}

${L("progressNoFiles")}
`;
    await writeFile(join(wsPath, "PROGRESS.md"), progressMd, "utf-8");

    // Initialize git repository
    try {
      await execFileAsync("git", ["init"], { cwd: wsPath });
      await execFileAsync("git", ["add", "-A"], { cwd: wsPath });
      await execFileAsync("git", ["commit", "-m", `Initial commit: ${projectName ?? "project"} workspace`], {
        cwd: wsPath,
        env: { ...process.env, GIT_AUTHOR_NAME: "Letro", GIT_AUTHOR_EMAIL: "letro@local", GIT_COMMITTER_NAME: "Letro", GIT_COMMITTER_EMAIL: "letro@local" },
      });
      this.logger.info({ projectId }, "Git repository initialized in workspace");
    } catch (err) {
      this.logger.warn({ projectId, err }, "Git init failed (non-fatal)");
    }

    const [ws] = await this.db
      .insert(executionWorkspaces)
      .values({ companyId, projectId, path: wsPath, status: "active" })
      .returning();

    this.logger.info({ projectId, path: wsPath }, "Workspace created");
    return { id: ws!.id, path: wsPath };
  }

  /** Looks up the active workspace for a project. */
  async getByProjectId(projectId: string): Promise<{ id: string; path: string } | null> {
    const ws = await this.db.query.executionWorkspaces.findFirst({
      where: eq(executionWorkspaces.projectId, projectId),
    });
    return ws ? { id: ws.id, path: ws.path } : null;
  }

  /** Reads the workspace directory recursively and returns a FileNode tree. */
  async getFileTree(projectId: string): Promise<FileNode> {
    const ws = await this.getByProjectId(projectId);
    if (!ws) return { name: "root", path: "/", type: "directory", children: [] };

    try {
      const children = await this.readDirRecursive(ws.path, ws.path, 0);
      return { name: "root", path: "/", type: "directory", children };
    } catch {
      return { name: "root", path: "/", type: "directory", children: [] };
    }
  }

  /** Reads a specific file from the workspace. */
  async getFileContent(projectId: string, filePath: string): Promise<FileContent> {
    const ws = await this.getByProjectId(projectId);
    if (!ws) throw new Error("Workspace not found");

    const resolved = resolve(ws.path, filePath.replace(/^\//, ""));
    // Path traversal protection
    if (!resolved.startsWith(ws.path)) {
      throw new Error("Invalid file path");
    }

    const stats = await stat(resolved);
    const ext = extname(resolved).toLowerCase();
    const language = EXT_LANG[ext] ?? "text";

    if (stats.size > MAX_FILE_SIZE) {
      return {
        path: filePath,
        content: `(파일이 너무 커서 표시할 수 없어요: ${(stats.size / 1024).toFixed(0)}KB)`,
        language,
        size: stats.size,
      };
    }

    if (BINARY_EXTS.has(ext)) {
      return { path: filePath, content: "(바이너리 파일)", language: "binary", size: stats.size };
    }

    const content = await readFile(resolved, "utf-8");
    return { path: filePath, content, language, size: stats.size };
  }

  private async readDirRecursive(basePath: string, dirPath: string, depth: number): Promise<FileNode[]> {
    if (depth >= MAX_TREE_DEPTH) return [];

    const entries = await readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    // Sort: directories first, then files, alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      if (entry.name.startsWith(".") && SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dirPath, entry.name);
      const relPath = "/" + relative(basePath, fullPath);

      if (entry.isDirectory()) {
        const children = await this.readDirRecursive(basePath, fullPath, depth + 1);
        nodes.push({ name: entry.name, path: relPath, type: "directory", children });
      } else {
        try {
          const s = await stat(fullPath);
          nodes.push({ name: entry.name, path: relPath, type: "file", size: s.size });
        } catch {
          nodes.push({ name: entry.name, path: relPath, type: "file" });
        }
      }
    }

    return nodes;
  }
}
