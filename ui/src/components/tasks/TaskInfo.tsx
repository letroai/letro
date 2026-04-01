import { Identity } from "@/components/shared/Identity";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";

interface TaskInfoProps {
  status: "todo" | "in_progress" | "done" | "paused" | "error" | "in_review";
  priority: Priority;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  className?: string;
}

const priorityLabels: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const priorityVariants: Record<Priority, "danger" | "warning" | "outline"> = {
  high: "danger",
  medium: "warning",
  low: "outline",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function TaskInfo({
  status,
  priority,
  assigneeName,
  createdAt,
  updatedAt,
  className,
}: TaskInfoProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <Badge variant={priorityVariants[priority]}>
          {priorityLabels[priority]}
        </Badge>
      </div>

      {assigneeName && (
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            담당
          </p>
          <div className="flex items-center gap-2">
            <Identity name={assigneeName} type="agent" size="sm" />
            <span className="text-sm text-[var(--text-primary)]">
              {assigneeName}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">
            생성일
          </p>
          <p className="text-[var(--text-secondary)]">{formatDate(createdAt)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">
            수정일
          </p>
          <p className="text-[var(--text-secondary)]">{formatDate(updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
