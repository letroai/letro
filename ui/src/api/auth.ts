import { api } from "./client";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export function getSession(): Promise<User> {
  return api.get<User>("/auth/session");
}
