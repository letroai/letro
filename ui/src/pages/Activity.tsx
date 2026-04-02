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
import { useLocale } from "@/providers/LocaleProvider";

export default function Activity() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLocale();

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
        <ProjectHeader title={t("activity.title")} />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title={t("activity.title")} />
        <SimpleErrorMessage
          message={t("activity.failedLoad")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div>
      <ProjectHeader title={t("activity.title")} />

      <div className="p-6">
        {items.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            message={t("activity.empty")}
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
  const { t } = useLocale();
  const config: Record<
    ActivityItem["type"],
    { key: string; variant: "default" | "success" | "warning" | "danger" }
  > = {
    task_created: { key: "activityType.taskCreated", variant: "default" },
    task_completed: { key: "activityType.taskCompleted", variant: "success" },
    agent_hired: { key: "activityType.agentHired", variant: "default" },
    agent_fired: { key: "activityType.agentFired", variant: "warning" },
    goal_completed: { key: "activityType.goalCompleted", variant: "success" },
    approval_requested: { key: "activityType.approvalRequested", variant: "warning" },
    error_occurred: { key: "activityType.errorOccurred", variant: "danger" },
    cost_alert: { key: "activityType.costAlert", variant: "warning" },
  };

  const entry = config[type];
  const label = entry ? t(entry.key) : type;
  const variant = entry?.variant ?? "default" as const;
  return <Badge variant={variant}>{label}</Badge>;
}
