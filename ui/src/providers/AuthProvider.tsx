// ui/src/providers/AuthProvider.tsx
// Manages the in-memory access token lifecycle:
//   1. On mount: attempts a silent token refresh (restores session after page reload)
//   2. Exposes login / register / logout operations
//   3. Sets the unauthorised handler so the API client can redirect to /auth
//   4. Schedules proactive token renewal before expiry (avoids mid-request 401s)

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  setAccessToken,
  clearAccessToken,
  setUnauthorizedHandler,
} from "@/api/auth-store";
import { login, logout, register } from "@/api/auth";
import type { AuthResponse, LoginInput, RegisterInput, User } from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";

// ===== Context =====

interface AuthContextValue {
  /**
   * Initiates login. On success, stores the access token and updates the
   * TanStack Query cache so all useAuth() consumers re-render immediately.
   */
  signIn: (input: LoginInput) => Promise<User>;
  /**
   * Initiates registration. On success, behaves the same as signIn.
   */
  signUp: (input: RegisterInput) => Promise<User>;
  /**
   * Clears the access token, invalidates the session query, and redirects to /auth.
   */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthActions(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthActions must be used inside <AuthProvider>");
  return ctx;
}

// ===== Provider =====

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whether the silent restore attempt has completed (avoids flash of login page)
  const [restored, setRestored] = useState(false);

  // ---- Token refresh scheduling ----
  function scheduleRefresh(expiresIn: number) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60 seconds before expiry
    const delay = Math.max((expiresIn - 60) * 1000, 1000);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string; expiresIn: number };
          setAccessToken(data.accessToken, data.expiresIn);
          scheduleRefresh(data.expiresIn);
        } else {
          // Refresh failed; let the unauthorised handler deal with redirecting
          clearAccessToken();
          queryClient.setQueryData(queryKeys.auth.session, null);
        }
      } catch {
        clearAccessToken();
        queryClient.setQueryData(queryKeys.auth.session, null);
      }
    }, delay);
  }

  // ---- Helpers ----
  function applyAuthResponse(data: AuthResponse) {
    setAccessToken(data.accessToken, data.expiresIn);
    scheduleRefresh(data.expiresIn);
    queryClient.setQueryData(queryKeys.auth.session, data.user);
  }

  // ---- Silent restore on mount ----
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { accessToken: string; expiresIn: number };
          setAccessToken(data.accessToken, data.expiresIn);
          scheduleRefresh(data.expiresIn);
          // The session query will pick up the user on its next fetch
        }
      } catch {
        // Ignore — user is not logged in yet
      } finally {
        if (!cancelled) setRestored(true);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Unauthorised redirect ----
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAccessToken();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      queryClient.setQueryData(queryKeys.auth.session, null);
      navigate("/auth", { replace: true });
    });
  }, [navigate, queryClient]);

  // ---- Clean up timer on unmount ----
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ---- Auth operations ----
  const signIn = async (input: LoginInput): Promise<User> => {
    const data = await login(input);
    applyAuthResponse(data);
    return data.user;
  };

  const signUp = async (input: RegisterInput): Promise<User> => {
    const data = await register(input);
    applyAuthResponse(data);
    return data.user;
  };

  const signOut = async (): Promise<void> => {
    try {
      await logout();
    } catch {
      // Always clear local state even if the server call fails
    }
    clearAccessToken();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    queryClient.setQueryData(queryKeys.auth.session, null);
    queryClient.clear();
    navigate("/auth", { replace: true });
  };

  // Don't render children until the silent restore has finished to avoid a
  // brief flash of the login page for users who are already logged in.
  if (!restored) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-10 h-10 rounded-lg bg-primary-500 animate-pulse" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
