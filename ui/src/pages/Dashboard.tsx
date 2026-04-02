import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getDashboard, type DashboardData } from "@/api/dashboard";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTimeAgo } from "@/lib/format";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import {
  Users,
  Play,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useLocale } from "@/providers/LocaleProvider";

export default function Dashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { locale } = useLocale();

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
        <ProjectHeader title={locale === "ko" ? "홈" : "Dashboard"} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "홈" : "Dashboard"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "대시보드 정보를 불러올 수 없어요." : "Failed to load dashboard."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const activeAgents = dashboard.activeAgents;
  const inProgressIssues = dashboard.inProgressIssues;
  const completedIssues = dashboard.completedIssues;
  const monthlyCostCents = dashboard.monthlyCostCents;
  const helpRequests = dashboard.helpRequests as Array<Record<string, unknown>>;
  const recentActivity = dashboard.recentActivities as Array<Record<string, unknown>>;

  return (
    <div>
      <ProjectHeader title={locale === "ko" ? "홈" : "Dashboard"} />

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            label={locale === "ko" ? "팀원" : "Members"}
            value={locale === "ko" ? `${activeAgents}명` : `${activeAgents}`}
            color="primary"
          />
          <MetricCard
            icon={Play}
            label={locale === "ko" ? "진행 중" : "In Progress"}
            value={locale === "ko" ? `${inProgressIssues}개` : `${inProgressIssues}`}
            color="warning"
          />
          <MetricCard
            icon={CheckCircle2}
            label={locale === "ko" ? "완료" : "Done"}
            value={locale === "ko" ? `${completedIssues}개` : `${completedIssues}`}
            color="success"
          />
          <MetricCard
            icon={DollarSign}
            label={locale === "ko" ? "이번 달" : "This Month"}
            value={formatCost(monthlyCostCents)}
            color="default"
          />
        </div>

        {/* Live Activity Feed */}
        <LiveActivityFeed />

        {/* Help Requests */}
        {helpRequests.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {locale === "ko" ? "도움이 필요해요" : "Help Needed"}
              </h2>
              <button
                onClick={() => navigate(`/p/${projectId}/help`)}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                {locale === "ko" ? "전체 보기" : "View All"}
              </button>
            </div>
            <div className="space-y-2">
              {helpRequests.slice(0, 3).map((req, idx) => (
                <div
                  key={String(req["id"] ?? idx)}
                  className="flex items-start gap-3 rounded-lg border border-warning-200 dark:border-warning-500/20 bg-warning-50 dark:bg-warning-500/5 p-4"
                >
                  <AlertCircle className="w-5 h-5 text-warning-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {String(req["taskTitle"] ?? req["title"] ?? (locale === "ko" ? "도움 요청" : "Help Request"))}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                      {String(req["message"] ?? req["description"] ?? "")}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {String(req["agentName"] ?? "")} &middot; {formatTimeAgo(String(req["createdAt"] ?? new Date().toISOString()))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Team Activity */}
        {activeAgents > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {locale === "ko" ? "팀 활동" : "Team Activity"}
              </h2>
              <button
                onClick={() => navigate(`/p/${projectId}/team`)}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                {locale === "ko" ? "팀 보기" : "View Team"}
              </button>
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {locale === "ko"
                    ? `현재 팀원 ${activeAgents}명이 ${inProgressIssues}개의 작업을 진행하고 있어요.`
                    : `${activeAgents} member(s) working on ${inProgressIssues} task(s).`}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {locale === "ko" ? "최근 활동" : "Recent Activity"}
              </h2>
              <button
                onClick={() => navigate(`/p/${projectId}/activity`)}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                {locale === "ko" ? "전체 보기" : "View All"}
              </button>
            </div>
            <div className="space-y-1">
              {recentActivity.slice(0, 5).map((item, idx) => (
                <div
                  key={String(item["id"] ?? idx)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ActivityTypeBadge type={String(item["kind"] ?? item["type"] ?? "")} />
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {String(item["summary"] ?? item["title"] ?? "")}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0 ml-3">
                    {formatTimeAgo(String(item["occurredAt"] ?? item["createdAt"] ?? new Date().toISOString()))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "primary" | "success" | "warning" | "default";
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  const colorMap = {
    primary: "text-primary-500 bg-primary-100 dark:bg-primary-900/30",
    success: "text-success-500 bg-success-50 dark:bg-success-500/10",
    warning: "text-warning-500 bg-warning-50 dark:bg-warning-500/10",
    default:
      "text-[var(--text-muted)] bg-[var(--bg-tertiary)]",
  };

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${colorMap[color]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function ActivityTypeBadge({ type }: { type: string }) {
  const { locale } = useLocale();
  const labelMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
    task_created: { label: locale === "ko" ? "작업" : "Task", variant: "default" },
    task_completed: { label: locale === "ko" ? "완료" : "Done", variant: "success" },
    agent_hired: { label: locale === "ko" ? "고용" : "Hired", variant: "default" },
    agent_fired: { label: locale === "ko" ? "해고" : "Fired", variant: "warning" },
    goal_completed: { label: locale === "ko" ? "목표" : "Goal", variant: "success" },
    approval_requested: { label: locale === "ko" ? "확인" : "Approval", variant: "warning" },
    error_occurred: { label: locale === "ko" ? "오류" : "Error", variant: "danger" },
    cost_alert: { label: locale === "ko" ? "비용" : "Cost", variant: "warning" },
  };

  const info = labelMap[type] ?? { label: type, variant: "default" as const };

  return <Badge variant={info.variant}>{info.label}</Badge>;
}
