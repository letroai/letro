// server/src/lib/task-output-store.ts
// Hybrid in-memory + DB storage for streaming task output.
// Memory buffer for real-time streaming, DB for persistence.

import { TASK_OUTPUT_BUFFER_BYTES } from "./defaults.js";
import { eq } from "drizzle-orm";
import { issues } from "@letro/db/schema";
import type { Database } from "@letro/db/client";

const memoryStore = new Map<string, string>();
const dirtyTasks = new Set<string>();
let dbRef: Database | null = null;
let flushInterval: ReturnType<typeof setInterval> | null = null;

/** Initialize the store with a DB reference for persistence. */
export function initTaskOutputStore(db: Database): void {
  dbRef = db;
  // Flush dirty outputs to DB every 10 seconds
  if (!flushInterval) {
    flushInterval = setInterval(() => {
      flushToDB().catch(() => {});
    }, 10_000);
  }
}

export function appendTaskOutput(taskId: string, chunk: string): void {
  const existing = memoryStore.get(taskId) ?? "";
  const updated = existing + chunk;
  memoryStore.set(taskId, updated.length > TASK_OUTPUT_BUFFER_BYTES ? updated.slice(-TASK_OUTPUT_BUFFER_BYTES) : updated);
  dirtyTasks.add(taskId);
}

export function getTaskOutput(taskId: string): string {
  return memoryStore.get(taskId) ?? "";
}

export function clearTaskOutput(taskId: string): void {
  memoryStore.delete(taskId);
  dirtyTasks.delete(taskId);
}

/** Load task output from DB (for page load when memory is empty). */
export async function loadTaskOutputFromDB(taskId: string): Promise<string> {
  // Check memory first
  const mem = memoryStore.get(taskId);
  if (mem) return mem;

  // Fall back to DB
  if (!dbRef) return "";
  try {
    const issue = await dbRef.query.issues.findFirst({
      where: eq(issues.id, taskId),
      columns: { metadata: true },
    });
    const metadata = issue?.metadata as Record<string, unknown> | null;
    return (metadata?.output as string) ?? "";
  } catch {
    return "";
  }
}

/** Flush all dirty task outputs to DB. */
async function flushToDB(): Promise<void> {
  if (!dbRef || dirtyTasks.size === 0) return;

  const taskIds = [...dirtyTasks];
  dirtyTasks.clear();

  for (const taskId of taskIds) {
    const output = memoryStore.get(taskId);
    if (!output) continue;

    try {
      // Store output in issues.metadata.output
      const issue = await dbRef.query.issues.findFirst({
        where: eq(issues.id, taskId),
        columns: { metadata: true },
      });
      const existing = (issue?.metadata as Record<string, unknown>) ?? {};
      await dbRef
        .update(issues)
        .set({ metadata: { ...existing, output: output.slice(-TASK_OUTPUT_BUFFER_BYTES) } })
        .where(eq(issues.id, taskId));
    } catch {
      // Re-mark as dirty for next flush
      dirtyTasks.add(taskId);
    }
  }
}
