import { Navigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export function ProjectRedirect() {
  const { projects, isLoading } = useProjects();

  if (isLoading) return <PageSkeleton variant="full" />;

  if (projects.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const lastProjectId = localStorage.getItem("lastProjectId");
  const targetProject = projects.find((p) => p.id === lastProjectId) ?? projects[0];

  return <Navigate to={`/p/${targetProject!.id}/home`} replace />;
}
