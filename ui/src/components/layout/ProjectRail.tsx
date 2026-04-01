import { useNavigate, useParams } from "react-router-dom";
import { ProjectRailItem } from "./ProjectRailItem";
import { useProjects } from "@/hooks/useProjects";
import { Plus } from "lucide-react";

export function ProjectRail() {
  const { projects } = useProjects();
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Hide when no projects (still show for 1+ so the "+" button is visible)
  if (projects.length === 0) return null;

  return (
    <div
      className="flex flex-col items-center w-12 py-3 gap-2 bg-[var(--bg-rail)] overflow-y-auto"
      role="navigation"
      aria-label="프로젝트 전환"
    >
      {projects.map((project) => (
        <ProjectRailItem
          key={project.id}
          project={project}
          isActive={project.id === projectId}
          onClick={() => navigate(`/p/${project.id}/home`)}
        />
      ))}

      <button
        onClick={() => navigate("/onboarding")}
        className="flex items-center justify-center w-9 h-9 rounded-xl
                   border-2 border-dashed border-white/30 text-white/50
                   hover:border-white/60 hover:text-white/80 transition-colors
                   mt-auto"
        aria-label="새 프로젝트 만들기"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
