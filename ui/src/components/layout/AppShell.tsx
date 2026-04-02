import { Outlet, Navigate, useParams } from "react-router-dom";
import { ProjectRail } from "./ProjectRail";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useProjects } from "@/hooks/useProjects";
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export function AppShell() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, isLoading } = useProjects();

  if (isLoading) return <PageSkeleton variant="full" />;

  const projectExists = projects.some((p) => p.id === projectId);
  if (!projectExists) {
    return <Navigate to={projects.length > 0 ? "/" : "/onboarding"} replace />;
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ProjectRail />
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--bg-app)]">
        <Outlet />
      </main>
    </div>
  );
}
