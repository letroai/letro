import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

type NotificationType = "info" | "success" | "warning" | "message";

interface NotificationRowProps {
  type: NotificationType;
  title: string;
  createdAt: string;
  unread?: boolean;
  onAction?: () => void;
  className?: string;
}

const typeConfig: Record<
  NotificationType,
  { icon: LucideIcon; color: string }
> = {
  info: { icon: Bell, color: "text-primary-500" },
  success: { icon: CheckCircle2, color: "text-success-500" },
  warning: { icon: AlertTriangle, color: "text-warning-500" },
  message: { icon: MessageSquare, color: "text-[var(--text-secondary)]" },
};

export function NotificationRow({
  type,
  title,
  createdAt,
  unread = false,
  onAction,
  className,
}: NotificationRowProps) {
  const { locale } = useLocale();
  const config = typeConfig[type];
  const TypeIcon = config.icon;

  return (
    <div
      onClick={onAction}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        unread && "bg-primary-50/50 dark:bg-primary-900/10",
        onAction && "cursor-pointer hover:bg-[var(--bg-hover)]",
        className,
      )}
    >
      <TypeIcon className={cn("w-4 h-4 shrink-0", config.color)} />
      <span
        className={cn(
          "flex-1 text-sm truncate",
          unread
            ? "font-medium text-[var(--text-primary)]"
            : "text-[var(--text-secondary)]",
        )}
      >
        {title}
      </span>
      <span className="text-xs text-[var(--text-muted)] shrink-0">
        {formatTimeAgo(createdAt, locale)}
      </span>
      {unread && (
        <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
      )}
    </div>
  );
}
