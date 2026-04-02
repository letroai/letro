import { AlertTriangle, AlertCircle, HelpCircle } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

interface HelpRequest {
  id: string;
  title: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
}

interface HelpRequestSectionProps {
  requests: HelpRequest[];
  onClickRequest?: (id: string) => void;
  className?: string;
}

const urgencyConfig = {
  high: {
    icon: AlertTriangle,
    color: "text-danger-500",
    label: "긴급",
  },
  medium: {
    icon: AlertCircle,
    color: "text-warning-500",
    label: "보통",
  },
  low: {
    icon: HelpCircle,
    color: "text-[var(--text-muted)]",
    label: "낮음",
  },
} as const;

export function HelpRequestSection({
  requests,
  onClickRequest,
  className,
}: HelpRequestSectionProps) {
  const { locale } = useLocale();
  if (requests.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        도움이 필요해요
      </h3>
      <ul className="flex flex-col gap-1">
        {requests.map((req) => {
          const config = urgencyConfig[req.urgency];
          const UrgencyIcon = config.icon;
          return (
            <li key={req.id}>
              <button
                onClick={() => onClickRequest?.(req.id)}
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left"
              >
                <UrgencyIcon className={cn("w-4 h-4 shrink-0", config.color)} />
                <span className="flex-1 text-sm text-[var(--text-primary)] truncate">
                  {req.title}
                </span>
                <span className="text-xs text-[var(--text-muted)] shrink-0">
                  {formatTimeAgo(req.createdAt, locale)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
