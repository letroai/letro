/**
 * TanStack Query key factory.
 * Centralizes all query keys for cache management and invalidation.
 */
export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },

  projects: {
    all: ["projects"] as const,
    detail: (id: string) => ["projects", id] as const,
    team: (id: string) => ["projects", id, "team"] as const,
  },

  team: {
    list: (projectId: string) => ["team", projectId] as const,
    detail: (projectId: string, agentId: string) =>
      ["team", projectId, agentId] as const,
  },

  tasks: {
    list: (projectId: string) => ["tasks", projectId] as const,
    detail: (projectId: string, taskId: string) =>
      ["tasks", projectId, taskId] as const,
    comments: (projectId: string, taskId: string) =>
      ["tasks", projectId, taskId, "comments"] as const,
  },

  goals: {
    list: (projectId: string) => ["goals", projectId] as const,
    detail: (projectId: string, goalId: string) =>
      ["goals", projectId, goalId] as const,
  },

  costs: {
    summary: (projectId: string) => ["costs", projectId, "summary"] as const,
  },

  activity: {
    list: (projectId: string) => ["activity", projectId] as const,
  },

  dashboard: {
    data: (projectId: string) => ["dashboard", projectId] as const,
  },

  notifications: {
    list: ["notifications"] as const,
  },
} as const;
