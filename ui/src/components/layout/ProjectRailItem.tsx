import type { Project } from "@/api/projects";
import { cn } from "@/lib/utils";

interface ProjectRailItemProps {
  project: Project;
  isActive: boolean;
  onClick: () => void;
}

export function ProjectRailItem({ project, isActive, onClick }: ProjectRailItemProps) {
  const initial = project.name.charAt(0).toUpperCase();

  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div
          className="absolute left-0 w-1 h-5 rounded-r-full bg-white"
          aria-hidden="true"
        />
      )}
      <button
        onClick={onClick}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-xl text-sm font-semibold transition-all",
          isActive
            ? "bg-primary-500 text-white shadow-md"
            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
        )}
        title={project.name}
        aria-label={`${project.name} 프로젝트로 전환`}
        aria-current={isActive ? "true" : undefined}
      >
        {initial}
      </button>
    </div>
  );
}
