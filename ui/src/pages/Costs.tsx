import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getCostSummary, type CostSummary } from "@/api/costs";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { formatCost, formatNumber } from "@/lib/format";
import { DollarSign } from "lucide-react";
import { useLocale } from "@/providers/LocaleProvider";

export default function Costs() {
  const { projectId } = useParams<{ projectId: string }>();
  const { locale, t } = useLocale();

  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery<CostSummary>({
    queryKey: queryKeys.costs.summary(projectId!),
    queryFn: () => getCostSummary(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={t("costs.title")} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div>
        <ProjectHeader title={t("costs.title")} />
        <SimpleErrorMessage
          message={t("costs.failedLoad")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const totalCost = summary.totalCostCents;

  return (
    <div>
      <ProjectHeader title={t("costs.title")} />

      <div className="p-6 space-y-6">
        {/* Cost Summary Card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-tertiary)]">
              <DollarSign className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t("costs.totalCost")}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCost(totalCost, locale)}
              </p>
            </div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            <span>{t("costs.totalTokens", { n: formatNumber(summary.totalTokens, locale) })}</span>
            <span className="mx-2">&middot;</span>
            <span>{t("costs.totalEvents", { n: formatNumber(summary.eventCount, locale) })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

