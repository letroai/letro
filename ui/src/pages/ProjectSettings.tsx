import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getProject, getTeam, pauseProject, resumeProject } from "@/api/projects";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import {
  Pause,
  Play,
  Loader2,
  Users,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";

export default function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.projects.detail(projectId!),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
    refetchInterval: 5000,
  });

  const { data: team } = useQuery({
    queryKey: queryKeys.projects.team(projectId!),
    queryFn: () => getTeam(projectId!),
    enabled: !!projectId,
  });

  const isPaused = !!(project as Record<string, unknown> | undefined)?.settings &&
    !!((project as Record<string, unknown>).settings as Record<string, unknown>)?.paused;

  const pauseMutation = useMutation({
    mutationFn: () => pauseProject(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.team(projectId!) });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeProject(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.team(projectId!) });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const isActing = pauseMutation.isPending || resumeMutation.isPending;

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title="설정" />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <ProjectHeader title="설정" />
        <SimpleErrorMessage message="프로젝트 정보를 불러올 수 없어요." />
      </div>
    );
  }

  const activeMembers = team?.members?.filter(
    (m) => m.status !== "terminated" && m.status !== "paused",
  ).length ?? 0;

  return (
    <div>
      <ProjectHeader title="설정" />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Project Control */}
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            프로젝트 제어
          </h2>

          {/* Status display */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isPaused
                  ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                  : "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {!isPaused && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isPaused ? "bg-warning-500" : "bg-success-500"
                  }`}
                />
              </span>
              {isPaused ? "정지됨" : "진행 중"}
            </div>

            {!isPaused && team && (
              <span className="text-sm text-[var(--text-muted)]">
                <Users className="w-3.5 h-3.5 inline mr-1" />
                팀원 {activeMembers}명 활동 중
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)]">
            {isPaused
              ? "프로젝트가 정지 상태예요. 팀장과 모든 팀원이 대기 중이에요. 재개하면 팀장이 현재 상황을 파악하고 작업을 다시 시작해요."
              : "팀장이 작업을 관리하고 팀원들이 실행하고 있어요. 정지하면 모든 작업이 즉시 멈추고 진행 중인 작업은 대기 상태로 돌아가요."}
          </p>

          {/* Action button */}
          {isPaused ? (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={isActing}
              className="flex items-center gap-2 rounded-lg bg-success-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resumeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              프로젝트 재개
            </button>
          ) : (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={isActing}
              className="flex items-center gap-2 rounded-lg bg-warning-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-warning-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pauseMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              프로젝트 정지
            </button>
          )}

          {/* Result feedback */}
          {pauseMutation.data && (
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              팀원 {pauseMutation.data.agentsPaused}명 정지, 작업 {pauseMutation.data.tasksReset}개 대기로 전환
            </p>
          )}
          {resumeMutation.data && (
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              팀원 {resumeMutation.data.membersResumed}명 재개, 팀장이 상황 파악 중...
            </p>
          )}

          {/* Error feedback */}
          {(pauseMutation.error || resumeMutation.error) && (
            <p className="text-sm text-danger-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              문제가 생겼어요. 다시 시도해 주세요.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
