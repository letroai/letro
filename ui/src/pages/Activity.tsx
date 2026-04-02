import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { listActivity, type ActivityItem } from "@/api/activity";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import {
  Activity as ActivityIcon,
  Plus,
  CheckCircle2,
  UserPlus,
  UserMinus,
  Target,
  HelpCircle,
  AlertTriangle,
  DollarSign,
  Bot,
  User,
  Cog,
} from "lucide-react";

export default function Activity() {
  const { projectId } = useParams<{ projectId: string }>();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.activity.list(projectId!),
    queryFn: () => listActivity(projectId!, { limit: 50 }),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title="활동 기록" />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title="활동 기록" />
        <SimpleErrorMessage
          message="활동 기록을 불러올 수 없어요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div>
      <ProjectHeader title="활동 기록" />

      <div className="p-6">
        {items.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            message="아직 활동 기록이 없어요."
          />
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = activityTypeIcon(item.type);

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-[var(--bg-hover)] transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-tertiary)] shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {item.title}
          </p>
          <ActivityTypeBadge type={item.type} />
        </div>
        {item.description && (
          <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
          {item.actorName && (
            <>
              <ActorIcon actorType={item.actorType} />
              <span>{item.actorName}</span>
              <span>&middot;</span>
            </>
          )}
          <span>{formatTimeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function ActorIcon({ actorType }: { actorType: ActivityItem["actorType"] }) {
  if (actorType === "human") {
    return <User className="w-3 h-3" />;
  }
  if (actorType === "agent") {
    return <Bot className="w-3 h-3" />;
  }
  return <Cog className="w-3 h-3" />;
}

function activityTypeIcon(type: ActivityItem["type"]) {
  const map: Record<ActivityItem["type"], React.ElementType> = {
    task_created: Plus,
    task_completed: CheckCircle2,
    agent_hired: UserPlus,
    agent_fired: UserMinus,
    goal_completed: Target,
    approval_requested: HelpCircle,
    error_occurred: AlertTriangle,
    cost_alert: DollarSign,
  };
  return map[type] ?? ActivityIcon;
}

function ActivityTypeBadge({ type }: { type: ActivityItem["type"] }) {
  const config: Record<
    ActivityItem["type"],
    { label: string; variant: "default" | "success" | "warning" | "danger" }
  > = {
    task_created: { label: "작업 생성", variant: "default" },
    task_completed: { label: "작업 완료", variant: "success" },
    agent_hired: { label: "팀원 고용", variant: "default" },
    agent_fired: { label: "팀원 해고", variant: "warning" },
    goal_completed: { label: "목표 달성", variant: "success" },
    approval_requested: { label: "확인 요청", variant: "warning" },
    error_occurred: { label: "오류", variant: "danger" },
    cost_alert: { label: "비용 알림", variant: "warning" },
  };

  const info = config[type] ?? { label: type, variant: "default" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
