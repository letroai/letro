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
  const { locale } = useLocale();

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
        <ProjectHeader title={locale === "ko" ? "목표" : "Goals"} />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "목표" : "Goals"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "목표를 불러올 수 없어요." : "Failed to load goals."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const allGoals = goals ?? [];

  return (
    <div>
      <ProjectHeader title={locale === "ko" ? "목표" : "Goals"} />

      <div className="p-6 space-y-4">
        {allGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            message={locale === "ko" ? "아직 목표가 없어요. 프로젝트가 시작되면 자동으로 생성돼요." : "No goals yet. Goals will be created automatically when the project starts."}
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
  const { locale } = useLocale();
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
          <span>{locale === "ko" ? "진행률" : "Progress"}</span>
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
        {locale === "ko" ? "마지막 업데이트:" : "Last updated:"} {formatTimeAgo(goal.updatedAt)}
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
  const { locale } = useLocale();
  const config: Record<
    Goal["status"],
    { ko: string; en: string; variant: "default" | "success" | "outline" }
  > = {
    active: { ko: "진행 중", en: "Active", variant: "default" },
    completed: { ko: "완료", en: "Completed", variant: "success" },
    abandoned: { ko: "중단됨", en: "Abandoned", variant: "outline" },
  };

  const entry = config[status];
  const label = entry ? (locale === "ko" ? entry.ko : entry.en) : status;
  const variant = entry?.variant ?? "outline" as const;
  return <Badge variant={variant}>{label}</Badge>;
}
