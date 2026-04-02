import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { queryKeys } from "@/api/queryKeys";
import { getUserPreferences } from "@/api/userPreferences";

export function ProjectRedirect() {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: queryKeys.userPreferences.all,
    queryFn: getUserPreferences,
    staleTime: 5 * 60 * 1000,
  });

  if (projectsLoading || prefsLoading) return <PageSkeleton variant="full" />;

  if (projects.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const lastProjectId = prefs?.lastProjectId;
  const targetProject =
    projects.find((p) => p.id === lastProjectId) ?? projects[0];

  return <Navigate to={`/p/${targetProject!.id}/home`} replace />;
}
