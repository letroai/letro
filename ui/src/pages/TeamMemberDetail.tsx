import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getAgent, type AgentDetail } from "@/api/agents";
import { listTasks, type Task } from "@/api/issues";
import { useLocale } from "@/providers/LocaleProvider";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTimeAgo } from "@/lib/format";
import {
  Crown,
  Users,
  CircleDot,
  Pause,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
} from "lucide-react";

export default function TeamMemberDetail() {
  const { projectId, memberId } = useParams<{
    projectId: string;
    memberId: string;
  }>();

  const { locale, t } = useLocale();

  const {
    data: agent,
    isLoading,
    error,
    refetch,
  } = useQuery<AgentDetail>({
    queryKey: queryKeys.team.detail(projectId!, memberId!),
    queryFn: () => getAgent(projectId!, memberId!),
    enabled: !!projectId && !!memberId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: queryKeys.tasks.list(projectId!),
    queryFn: () => listTasks(projectId!, { assigneeId: memberId }),
    enabled: !!projectId && !!memberId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={t("team.memberDetail")} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div>
        <ProjectHeader title={t("team.memberDetail")} />
        <SimpleErrorMessage
          message={t("team.memberFailedLoad")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isLeader = agent.teamRole === "leader";
  const roleLabel = isLeader ? t("team.leader") : t("team.memberDetail");
  const assignedTasks = tasks ?? [];
  const inProgressTasks = assignedTasks.filter(
    (t) => t.status === "in_progress",
  );
  const completedTasks = assignedTasks.filter((t) => t.status === "done");

  return (
    <div>
      <ProjectHeader title={agent.name} />

      <div className="p-6 space-y-6">
        {/* Member Info */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                isLeader
                  ? "bg-primary-100 dark:bg-primary-900/30"
                  : "bg-[var(--bg-tertiary)]"
              }`}
            >
              {isLeader ? (
                <Crown className="w-6 h-6 text-primary-500" />
              ) : (
                <Users className="w-6 h-6 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {agent.name}
                </h2>
                <Badge variant="default">{roleLabel}</Badge>
                <MemberStatusBadge status={agent.status} />
              </div>
              {agent.executionRole && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {agent.executionRole}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[var(--border-default)]">
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">{t("team.totalCost")}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                {formatCost(agent.totalCost, locale)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">{t("team.inProgressCount")}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                {inProgressTasks.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">{t("team.completedCount")}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                {completedTasks.length}
              </p>
            </div>
          </div>

          {/* Meta info */}
          <div className="space-y-2 pt-3 border-t border-[var(--border-default)]">
            {agent.lastHeartbeatAt && (
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">
                  {t("team.lastActivity")} {formatTimeAgo(agent.lastHeartbeatAt, locale)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">
                {t("team.totalCost")} {formatCost(agent.totalCost, locale)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">
                {t("team.joinedAt")} {formatTimeAgo(agent.createdAt, locale)}
              </span>
            </div>
          </div>
        </div>

        {/* Work Progress */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {t("team.taskStatus")}
          </h2>

          {assignedTasks.length === 0 ? (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
              <p className="text-sm text-[var(--text-secondary)] text-center">
                {t("team.noTasks")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {formatTimeAgo(task.updatedAt, locale)}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function MemberStatusBadge({ status }: { status: AgentDetail["status"] }) {
  const { t } = useLocale();
  const config: Record<
    AgentDetail["status"],
    { key: string; variant: "success" | "warning" | "danger" | "outline" }
  > = {
    active: { key: "team.statusActive", variant: "success" },
    paused: { key: "team.statusPaused", variant: "warning" },
    idle: { key: "team.statusIdle", variant: "outline" },
    error: { key: "team.statusError", variant: "danger" },
  };

  const entry = config[status] ?? { key: status, variant: "outline" as const };
  return <Badge variant={entry.variant}>{t(entry.key)}</Badge>;
}

function TaskStatusBadge({ status }: { status: Task["status"] }) {
  const { t } = useLocale();
  const config: Record<
    Task["status"],
    { key: string; variant: "default" | "success" | "warning" | "danger" | "outline" }
  > = {
    open: { key: "status.waiting", variant: "outline" },
    in_progress: { key: "status.inProgress", variant: "default" },
    review: { key: "status.inReview", variant: "warning" },
    done: { key: "status.done", variant: "success" },
    blocked: { key: "status.blocked", variant: "danger" },
  };

  const entry = config[status] ?? { key: status, variant: "outline" as const };
  return <Badge variant={entry.variant}>{t(entry.key)}</Badge>;
}
