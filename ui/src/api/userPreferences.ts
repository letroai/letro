import { api } from "./client";

export interface UserPreferences {
  userId: string;
  theme: "light" | "dark" | "system";
  lastProjectId: string | null;
}

export function getUserPreferences(): Promise<UserPreferences> {
  return api.get<UserPreferences>("/user/preferences");
}

export function updateUserPreferences(
  data: Partial<Pick<UserPreferences, "theme" | "lastProjectId">>,
): Promise<UserPreferences> {
  return api.patch<UserPreferences>("/user/preferences", data);
}
