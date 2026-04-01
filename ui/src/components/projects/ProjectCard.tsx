import { Users, ListChecks, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  name: string;
  status: "active" | "paused" | "completed";
  teamCount: number;
  taskCount: number;
  costCents: number;
  lastActivityAt: string;
  onClick?: () => void;
  className?: string;
}

const statusConfig = {
  active: { label: "진행 중", variant: "success" as const },
  paused: { label: "일시정지", variant: "warning" as const },
  completed: { label: "완료", variant: "default" as const },
};

export function ProjectCard({
  name,
  status,
  teamCount,
  taskCount,
  costCents,
  lastActivityAt,
  onClick,
  className,
}: ProjectCardProps) {
  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]",
        onClick && "cursor-pointer hover:border-primary-300 hover:shadow-md transition-all",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
          {name}
        </h3>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          팀원 {teamCount}명
        </span>
        <span className="flex items-center gap-1">
          <ListChecks className="w-3 h-3" />
          작업 {taskCount}개
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{formatCost(costCents)}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(lastActivityAt)}
        </span>
      </div>
    </div>
  );
}
