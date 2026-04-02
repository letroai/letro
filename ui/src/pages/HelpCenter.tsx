import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getDashboard, type DashboardData, type HelpRequest } from "@/api/dashboard";
import { useLocale } from "@/providers/LocaleProvider";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimeAgo } from "@/lib/format";
import {
  HelpCircle,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

export default function HelpCenter() {
  const { projectId } = useParams<{ projectId: string }>();
  const { locale } = useLocale();
  const navigate = useNavigate();

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboard.data(projectId!),
    queryFn: () => getDashboard(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "도움이 필요한 것" : "Help Requests"} />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "도움이 필요한 것" : "Help Requests"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "정보를 불러올 수 없어요." : "Failed to load information."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const helpRequests = dashboard.helpRequests as Array<Record<string, unknown>>;

  return (
    <div>
      <ProjectHeader title={locale === "ko" ? "도움이 필요한 것" : "Help Requests"} />

      <div className="p-6 space-y-4">
        {helpRequests.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={CheckCircle2}
              message={locale === "ko" ? "지금은 도움이 필요한 것이 없어요. 팀이 잘 진행하고 있어요!" : "No help needed right now. The team is doing great!"}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              {locale === "ko"
                ? "팀원이 진행하다가 결정이 필요하거나 도움이 필요할 때 여기에 나타나요."
                : "When a team member needs a decision or help while working, it appears here."}
            </p>
            <div className="space-y-3">
              {helpRequests.map((request, idx) => (
                <div
                  key={String(request["id"] ?? idx)}
                  onClick={() => navigate(`/p/${projectId}/tasks/${String(request["taskId"] ?? "")}`)}
                  className="flex items-start gap-3 rounded-lg border border-warning-200 dark:border-warning-500/20 bg-warning-50 dark:bg-warning-500/5 p-4 cursor-pointer hover:bg-warning-100 dark:hover:bg-warning-500/10 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-warning-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {String(request["title"] ?? request["taskTitle"] ?? (locale === "ko" ? "도움 요청" : "Help Request"))}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {String(request["message"] ?? request["description"] ?? "")}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {String(request["agentName"] ?? "")}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function HelpRequestCard({
  request,
  onClick,
}: {
  request: HelpRequest;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-warning-200 dark:border-warning-500/20 bg-warning-50 dark:bg-warning-500/5 p-5 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-warning-100 dark:bg-warning-500/10 shrink-0">
          <HelpCircle className="w-5 h-5 text-warning-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {request.taskTitle}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-3">
            {request.message}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
            <MessageSquare className="w-3 h-3" />
            <span>{request.agentName}</span>
            <span>&middot;</span>
            <span>{formatTimeAgo(request.createdAt)}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
      </div>
    </button>
  );
}
