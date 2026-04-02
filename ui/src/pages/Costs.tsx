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
  const { locale } = useLocale();

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
        <ProjectHeader title={locale === "ko" ? "비용" : "Costs"} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "비용" : "Costs"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "비용 정보를 불러올 수 없어요." : "Failed to load cost information."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const totalCost = summary.totalCostCents;

  return (
    <div>
      <ProjectHeader title={locale === "ko" ? "비용" : "Costs"} />

      <div className="p-6 space-y-6">
        {/* Cost Summary Card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-tertiary)]">
              <DollarSign className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">{locale === "ko" ? "총 사용 비용" : "Total Cost"}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCost(totalCost)}
              </p>
            </div>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            <span>{locale === "ko" ? `총 ${formatNumber(summary.totalTokens)} 토큰 사용` : `${formatNumber(summary.totalTokens)} tokens used`}</span>
            <span className="mx-2">&middot;</span>
            <span>{locale === "ko" ? `${formatNumber(summary.eventCount)}건 처리` : `${formatNumber(summary.eventCount)} events`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

