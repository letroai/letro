// ui/src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getSession, login, logout, register, type User, type LoginInput, type RegisterInput } from "@/api/auth";
import { setAccessToken, clearAccessToken } from "@/api/auth-store";

/** Core hook — returns the current session user and loading state. */
export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: queryKeys.auth.session,
    queryFn: getSession,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}

/**
 * Login mutation.
 * On success, stores the access token and updates the session cache.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (data) => {
      setAccessToken(data.accessToken, data.expiresIn);
      queryClient.setQueryData(queryKeys.auth.session, data.user);
    },
  });
}

/**
 * Registration mutation.
 * On success, stores the access token and updates the session cache.
 */
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (data) => {
      setAccessToken(data.accessToken, data.expiresIn);
      queryClient.setQueryData(queryKeys.auth.session, data.user);
    },
  });
}

/** Logout mutation. Clears the token and resets the session query. */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      clearAccessToken();
      queryClient.setQueryData(queryKeys.auth.session, null);
      queryClient.clear();
      navigate("/auth", { replace: true });
    },
  });
}
