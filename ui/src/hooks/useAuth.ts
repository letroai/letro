import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { getSession, type User } from "@/api/auth";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
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
