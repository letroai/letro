import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export function AuthGate() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSkeleton variant="full" />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  return <Outlet />;
}
