import { api } from "./client";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorType: "human" | "agent";
  content: string;
  createdAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Task["priority"];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
}

export async function listTasks(
  projectId: string,
  params?: { status?: string; assigneeId?: string },
): Promise<Task[]> {
  const result = await api.get<Task[] | { issues: Task[]; total: number }>(
    `/projects/${projectId}/tasks`,
    params,
  );
  // Server may return { issues: [...], total } or raw array
  if (Array.isArray(result)) return result;
  return result.issues ?? [];
}

export function getTask(projectId: string, taskId: string): Promise<Task> {
  return api.get<Task>(`/projects/${projectId}/tasks/${taskId}`);
}

export function createTask(
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  return api.post<Task>(`/projects/${projectId}/tasks`, input);
}

export function updateTask(
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  return api.patch<Task>(`/projects/${projectId}/tasks/${taskId}`, input);
}

export function getComments(
  projectId: string,
  taskId: string,
): Promise<Comment[]> {
  return api.get<Comment[]>(`/projects/${projectId}/tasks/${taskId}/comments`);
}

export function getTaskOutput(
  projectId: string,
  taskId: string,
): Promise<{ output: string }> {
  return api.get<{ output: string }>(
    `/projects/${projectId}/tasks/${taskId}/output`,
  );
}

export function addComment(
  projectId: string,
  taskId: string,
  content: string,
): Promise<Comment> {
  return api.post<Comment>(`/projects/${projectId}/tasks/${taskId}/comments`, {
    content,
  });
}
