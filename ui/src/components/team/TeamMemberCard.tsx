import { Identity } from "@/components/shared/Identity";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

interface TeamMemberCardProps {
  name: string;
  role: string;
  status: "working" | "idle" | "paused" | "error";
  currentTask?: string;
  costCents: number;
  onClick?: () => void;
  className?: string;
}

export function TeamMemberCard({
  name,
  role,
  status,
  currentTask,
  costCents,
  onClick,
  className,
}: TeamMemberCardProps) {
  const { locale } = useLocale();
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]",
        onClick && "cursor-pointer hover:border-primary-300 transition-colors",
        className,
      )}
    >
      <Identity name={name} type="agent" size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {name}
          </span>
          <Badge variant="outline">{role}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={status} />
          {currentTask && (
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {currentTask}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-[var(--text-muted)] shrink-0">
        {formatCost(costCents, locale)}
      </span>
    </div>
  );
}
