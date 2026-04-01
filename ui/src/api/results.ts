import { api } from "./client";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  language: string | null;
  size: number;
}

export async function getFileTree(projectId: string): Promise<FileNode[]> {
  const result = await api.get<FileNode | FileNode[]>(`/projects/${projectId}/results/tree`);
  // Server may return a single root node or an array
  if (Array.isArray(result)) return result;
  // Single root with children → return children (or wrap root as array)
  if (result && result.children && result.children.length > 0) return result.children;
  return [];
}

export function getFileContent(
  projectId: string,
  filePath: string,
): Promise<FileContent> {
  return api.get<FileContent>(`/projects/${projectId}/results/file`, {
    path: filePath,
  });
}
