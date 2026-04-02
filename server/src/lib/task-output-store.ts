// server/src/lib/task-output-store.ts
// In-memory buffer for streaming task output.
// Allows users who open a task mid-execution to see accumulated output.

const store = new Map<string, string>();

const MAX_SIZE = 512 * 1024; // 512KB per task

export function appendTaskOutput(taskId: string, chunk: string): void {
  const existing = store.get(taskId) ?? "";
  const updated = existing + chunk;
  // Ring-buffer: keep the last MAX_SIZE bytes
  store.set(taskId, updated.length > MAX_SIZE ? updated.slice(-MAX_SIZE) : updated);
}

export function getTaskOutput(taskId: string): string {
  return store.get(taskId) ?? "";
}

export function clearTaskOutput(taskId: string): void {
  store.delete(taskId);
}
