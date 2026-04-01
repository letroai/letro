import { Star, Users, ListChecks } from "lucide-react";
import { Identity } from "@/components/shared/Identity";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

interface TeamLeaderCardProps {
  name: string;
  status: "working" | "idle" | "paused" | "error";
  teamCount: number;
  taskCount: number;
  onClick?: () => void;
  className?: string;
}

export function TeamLeaderCard({
  name,
  status,
  teamCount,
  taskCount,
  onClick,
  className,
}: TeamLeaderCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]",
        onClick && "cursor-pointer hover:border-primary-300 transition-colors",
        className,
      )}
    >
      <Identity name={name} type="agent" size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-warning-500 fill-warning-500" />
          <span className="text-xs font-semibold text-warning-600 dark:text-warning-400">
            팀장
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
          {name}
        </p>
        <StatusBadge status={status} className="mt-1" />
      </div>
      <div className="flex flex-col gap-1 shrink-0 text-right">
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Users className="w-3 h-3" />
          <span>팀원 {teamCount}명</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <ListChecks className="w-3 h-3" />
          <span>작업 {taskCount}개</span>
        </div>
      </div>
    </div>
  );
}
