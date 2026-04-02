import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { listProjects, type Project } from "@/api/projects";
import { useLocale } from "@/providers/LocaleProvider";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTimeAgo } from "@/lib/format";
import { FolderKanban, Plus, ArrowRight } from "lucide-react";

export default function ProjectList() {
  const navigate = useNavigate();
  const { locale } = useLocale();

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
          message={locale === "ko" ? "프로젝트 목록을 불러올 수 없어요." : "Failed to load projects."}
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
          {locale === "ko" ? "프로젝트" : "Projects"}
        </h1>
        <button
          onClick={() => navigate("/onboarding")}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {locale === "ko" ? "새 프로젝트" : "New Project"}
        </button>
      </div>

      {/* Project Grid */}
      {allProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          message={locale === "ko" ? "아직 프로젝트가 없어요. 아이디어 하나로 시작해 보세요!" : "No projects yet. Start with a single idea!"}
          actionLabel={locale === "ko" ? "새 프로젝트 시작하기" : "Start a New Project"}
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
  const { locale } = useLocale();

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
              <span>{locale === "ko" ? "진행률" : "Progress"}</span>
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
            <span>{locale === "ko" ? "비용" : "Cost"}: {formatCost(project.totalCost)}</span>
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
  const { locale } = useLocale();

  const config: Record<
    Project["status"],
    { label: { ko: string; en: string }; variant: "default" | "success" | "warning" | "outline" }
  > = {
    active: { label: { ko: "진행 중", en: "Active" }, variant: "default" },
    paused: { label: { ko: "일시 정지", en: "Paused" }, variant: "warning" },
    completed: { label: { ko: "완료", en: "Completed" }, variant: "success" },
    archived: { label: { ko: "보관됨", en: "Archived" }, variant: "outline" },
  };

  const entry = config[status] ?? { label: { ko: status, en: status }, variant: "outline" as const };
  const label = locale === "ko" ? entry.label.ko : entry.label.en;
  return <Badge variant={entry.variant}>{label}</Badge>;
}
