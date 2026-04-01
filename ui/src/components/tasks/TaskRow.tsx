import { Circle, CheckCircle2, Loader2, PauseCircle, AlertCircle } from "lucide-react";
import { Identity } from "@/components/shared/Identity";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done" | "paused" | "error";
type Priority = "high" | "medium" | "low";

interface TaskRowProps {
  title: string;
  status: TaskStatus;
  priority: Priority;
  assigneeName?: string;
  updatedAt: string;
  onClick?: () => void;
  className?: string;
}

const statusIcons: Record<TaskStatus, React.ElementType> = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
  paused: PauseCircle,
  error: AlertCircle,
};

const statusIconColors: Record<TaskStatus, string> = {
  todo: "text-[var(--text-muted)]",
  in_progress: "text-primary-500 animate-spin",
  done: "text-success-500",
  paused: "text-warning-500",
  error: "text-danger-500",
};

const priorityDots: Record<Priority, string> = {
  high: "bg-danger-500",
  medium: "bg-warning-500",
  low: "bg-[var(--text-muted)]",
};

export function TaskRow({
  title,
  status,
  priority,
  assigneeName,
  updatedAt,
  onClick,
  className,
}: TaskRowProps) {
  const StatusIcon = statusIcons[status];

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]",
        onClick && "cursor-pointer hover:bg-[var(--bg-hover)] transition-colors",
        className,
      )}
    >
      <StatusIcon className={cn("w-4 h-4 shrink-0", statusIconColors[status])} />
      <span className="flex-1 text-sm text-[var(--text-primary)] truncate">
        {title}
      </span>
      <span className={cn("w-2 h-2 rounded-full shrink-0", priorityDots[priority])} />
      {assigneeName && (
        <Identity name={assigneeName} type="agent" size="sm" />
      )}
      <span className="text-xs text-[var(--text-muted)] shrink-0">
        {formatTimeAgo(updatedAt)}
      </span>
    </div>
  );
}
