import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { listProjects, type Project } from "@/api/projects";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTimeAgo } from "@/lib/format";
import { FolderKanban, Plus, ArrowRight } from "lucide-react";

export default function ProjectList() {
  const navigate = useNavigate();

  const {
    data: projects,
    isLoading,
    error,
    refetch,
  } = useQuery<Project[]>({
    queryKey: queryKeys.projects.all,
    queryFn: listProjects,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <SimpleErrorMessage
          message="프로젝트 목록을 불러올 수 없어요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const allProjects = projects ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          프로젝트
        </h1>
        <button
          onClick={() => navigate("/onboarding")}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 프로젝트
        </button>
      </div>

      {/* Project Grid */}
      {allProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          message="아직 프로젝트가 없어요. 아이디어 하나로 시작해 보세요!"
          actionLabel="새 프로젝트 시작하기"
          onAction={() => navigate("/onboarding")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/p/${project.id}/home`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function ProjectCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 hover:border-[var(--border-hover)] hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
              {project.name}
            </h3>
            <ProjectStatusBadge status={project.status} />
          </div>

          {project.description && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>진행률</span>
              <span>{Math.round(project.progress * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${Math.round(project.progress * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 text-xs text-[var(--text-muted)]">
            <span>비용: {formatCost(project.totalCost)}</span>
            <span>&middot;</span>
            <span>{formatTimeAgo(project.updatedAt)}</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 ml-2" />
      </div>
    </button>
  );
}

function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const config: Record<
    Project["status"],
    { label: string; variant: "default" | "success" | "warning" | "outline" }
  > = {
    active: { label: "진행 중", variant: "default" },
    paused: { label: "일시 정지", variant: "warning" },
    completed: { label: "완료", variant: "success" },
    archived: { label: "보관됨", variant: "outline" },
  };

  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
