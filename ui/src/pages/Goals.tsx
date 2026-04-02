import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { listGoals, type Goal } from "@/api/goals";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import { Target, CheckCircle2, Circle, XCircle } from "lucide-react";
import { useLocale } from "@/providers/LocaleProvider";

export default function Goals() {
  const { projectId } = useParams<{ projectId: string }>();
  const { locale, t } = useLocale();

  const {
    data: goals,
    isLoading,
    error,
    refetch,
  } = useQuery<Goal[]>({
    queryKey: queryKeys.goals.list(projectId!),
    queryFn: () => listGoals(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={t("goals.title")} />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title={t("goals.title")} />
        <SimpleErrorMessage
          message={t("goals.failedLoad")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const allGoals = goals ?? [];

  return (
    <div>
      <ProjectHeader title={t("goals.title")} />

      <div className="p-6 space-y-4">
        {allGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            message={t("goals.empty")}
          />
        ) : (
          <div className="space-y-3">
            {allGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function GoalCard({ goal }: { goal: Goal }) {
  const { locale, t } = useLocale();
  const progressPercent = Math.round(goal.progress * 100);

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <GoalStatusIcon status={goal.status} />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
        </div>
        <GoalStatusBadge status={goal.status} />
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{t("goals.progress")}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              goal.status === "completed"
                ? "bg-success-500"
                : goal.status === "abandoned"
                  ? "bg-[var(--text-muted)]"
                  : "bg-primary-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-[var(--text-muted)]">
        {t("goals.lastUpdated")} {formatTimeAgo(goal.updatedAt, locale)}
      </div>
    </div>
  );
}

function GoalStatusIcon({ status }: { status: Goal["status"] }) {
  if (status === "completed") {
    return <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0 mt-0.5" />;
  }
  if (status === "abandoned") {
    return <XCircle className="w-5 h-5 text-[var(--text-muted)] shrink-0 mt-0.5" />;
  }
  return <Circle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />;
}

function GoalStatusBadge({ status }: { status: Goal["status"] }) {
  const { t } = useLocale();
  const config: Record<
    Goal["status"],
    { key: string; variant: "default" | "success" | "outline" }
  > = {
    active: { key: "goals.statusActive", variant: "default" },
    completed: { key: "goals.statusCompleted", variant: "success" },
    abandoned: { key: "goals.statusAbandoned", variant: "outline" },
  };

  const entry = config[status];
  const label = entry ? t(entry.key) : status;
  const variant = entry?.variant ?? "outline" as const;
  return <Badge variant={variant}>{label}</Badge>;
}
