import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import {
  listNotifications,
  markNotificationRead,
  type Notification,
} from "@/api/notifications";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Bell,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Circle,
} from "lucide-react";

export default function Inbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: queryKeys.notifications.list,
    queryFn: listNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.list,
      });
    },
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title="알림" />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title="알림" />
        <SimpleErrorMessage
          message="알림을 불러올 수 없어요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const all = notifications ?? [];
  const unread = all.filter((n) => !n.read);
  const read = all.filter((n) => n.read);

  const handleClick = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.linkTo) {
      navigate(notification.linkTo);
    }
  };

  return (
    <div>
      <ProjectHeader title="알림" />

      <div className="p-6 space-y-6">
        {all.length === 0 ? (
          <EmptyState icon={Bell} message="알림이 없어요." />
        ) : (
          <>
            {/* Unread */}
            {unread.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  읽지 않음 ({unread.length})
                </h2>
                <div className="space-y-1">
                  {unread.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => handleClick(n)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Read */}
            {read.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  읽음 ({read.length})
                </h2>
                <div className="space-y-1">
                  {read.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => handleClick(n)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const Icon = notificationTypeIcon(notification.type);
  const isUnread = !notification.read;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors",
        isUnread
          ? "bg-primary-50 dark:bg-primary-900/5 hover:bg-primary-100 dark:hover:bg-primary-900/10"
          : "hover:bg-[var(--bg-hover)]",
      )}
    >
      <div className="relative shrink-0 mt-0.5">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            isUnread
              ? "bg-primary-100 dark:bg-primary-900/30"
              : "bg-[var(--bg-tertiary)]",
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              isUnread ? "text-primary-500" : "text-[var(--text-muted)]",
            )}
          />
        </div>
        {isUnread && (
          <Circle className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 fill-primary-500 text-primary-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              isUnread
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--text-secondary)]",
            )}
          >
            {notification.title}
          </p>
          <NotificationTypeBadge type={notification.type} />
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-xs text-[var(--text-muted)] mt-1 inline-block">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </div>
    </button>
  );
}

function notificationTypeIcon(type: Notification["type"]) {
  const map: Record<Notification["type"], React.ElementType> = {
    help_needed: HelpCircle,
    approval_required: ShieldAlert,
    task_completed: CheckCircle2,
    budget_alert: DollarSign,
    error: AlertTriangle,
  };
  return map[type] ?? Bell;
}

function NotificationTypeBadge({ type }: { type: Notification["type"] }) {
  const config: Record<
    Notification["type"],
    { label: string; variant: "default" | "success" | "warning" | "danger" }
  > = {
    help_needed: { label: "도움", variant: "warning" },
    approval_required: { label: "확인", variant: "warning" },
    task_completed: { label: "완료", variant: "success" },
    budget_alert: { label: "비용", variant: "warning" },
    error: { label: "오류", variant: "danger" },
  };

  const info = config[type] ?? { label: type, variant: "default" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
