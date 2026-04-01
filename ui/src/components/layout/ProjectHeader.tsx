import { useNavigate, useParams } from "react-router-dom";
import { Settings } from "lucide-react";

interface ProjectHeaderProps {
  title?: string;
}

export function ProjectHeader({ title }: ProjectHeaderProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)]">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        {title ?? "프로젝트"}
      </h1>
      {projectId && (
        <button
          onClick={() => navigate(`/p/${projectId}/settings/style`)}
          className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="설정"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </header>
  );
}
