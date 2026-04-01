import { api } from "./client";

export interface Notification {
  id: string;
  userId: string;
  type:
    | "help_needed"
    | "approval_required"
    | "task_completed"
    | "budget_alert"
    | "error";
  title: string;
  message: string;
  read: boolean;
  projectId: string | null;
  linkTo: string | null;
  createdAt: string;
}

export function listNotifications(): Promise<Notification[]> {
  return api.get<Notification[]>("/notifications");
}

export function markNotificationRead(id: string): Promise<void> {
  return api.patch<void>(`/notifications/${id}/read`);
}
