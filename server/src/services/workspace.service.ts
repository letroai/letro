// server/src/services/workspace.service.ts
import { eq } from "drizzle-orm";
import { executionWorkspaces } from "@letro/db/schema";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { resolve, join, extname, relative } from "node:path";
import type { ServiceDependencies } from "./index.js";

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
  ".turbo", "dist", ".embedded-pg", ".venv", ".env",
]);

const MAX_TREE_DEPTH = 6;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

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
  async createForProject(companyId: string, projectId: string): Promise<{ id: string; path: string }> {
    const wsPath = resolve(this.config.workspacesDir, projectId);
    await mkdir(wsPath, { recursive: true });

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

    // Skip binary files
    const binaryExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib"]);
    if (binaryExts.has(ext)) {
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
