// ui/src/api/auth.ts
import { api } from "./client";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Returns the currently authenticated user (null on 401). */
export async function getSession(): Promise<User | null> {
  try {
    return await api.get<User>("/auth/session");
  } catch {
    return null;
  }
}

/** Register a new account. Returns user + access token on success. */
export function register(input: RegisterInput): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", input, { skipAuth: true });
}

/** Login with email + password. Returns user + access token on success. */
export function login(input: LoginInput): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", input, { skipAuth: true });
}

/** Log out the current session (clears the httpOnly refresh cookie). */
export function logout(): Promise<void> {
  return api.post<void>("/auth/logout");
}
