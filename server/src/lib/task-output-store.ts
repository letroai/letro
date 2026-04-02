// server/src/lib/task-output-store.ts
// In-memory buffer for streaming task output.
// Allows users who open a task mid-execution to see accumulated output.

import { TASK_OUTPUT_BUFFER_BYTES } from "./defaults.js";

const store = new Map<string, string>();

export function appendTaskOutput(taskId: string, chunk: string): void {
  const existing = store.get(taskId) ?? "";
  const updated = existing + chunk;
  // Ring-buffer: keep the last TASK_OUTPUT_BUFFER_BYTES bytes
  store.set(taskId, updated.length > TASK_OUTPUT_BUFFER_BYTES ? updated.slice(-TASK_OUTPUT_BUFFER_BYTES) : updated);
}

export function getTaskOutput(taskId: string): string {
  return store.get(taskId) ?? "";
}

export function clearTaskOutput(taskId: string): void {
  store.delete(taskId);
}
