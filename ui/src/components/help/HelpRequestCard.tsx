import { AlertTriangle, AlertCircle, HelpCircle } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

interface HelpRequestCardProps {
  title: string;
  description?: string;
  memberName: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const urgencyConfig = {
  high: {
    icon: AlertTriangle,
    barColor: "bg-danger-500",
    iconColor: "text-danger-500",
  },
  medium: {
    icon: AlertCircle,
    barColor: "bg-warning-500",
    iconColor: "text-warning-500",
  },
  low: {
    icon: HelpCircle,
    barColor: "bg-primary-400",
    iconColor: "text-primary-400",
  },
} as const;

export function HelpRequestCard({
  title,
  description,
  memberName,
  urgency,
  createdAt,
  actionLabel,
  onAction,
  className,
}: HelpRequestCardProps) {
  const { locale } = useLocale();
  const config = urgencyConfig[urgency];
  const UrgencyIcon = config.icon;

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {/* Left color bar */}
      <div className={cn("w-1 shrink-0", config.barColor)} />

      <div className="flex-1 p-4">
        <div className="flex items-start gap-3">
          <UrgencyIcon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
              <span>{memberName}</span>
              <span>·</span>
              <span>{formatTimeAgo(createdAt, locale)}</span>
            </div>
            {description && (
              <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {actionLabel && onAction && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={onAction}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
