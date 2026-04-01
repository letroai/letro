import { cn } from "@/lib/utils";

type Status =
  | "working"
  | "idle"
  | "paused"
  | "error"
  | "done"
  | "in_progress"
  | "open"
  | "backlog"
  | "todo"
  | "in_review"
  | "cancelled";

interface StatusConfig {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
}

const statusMap: Record<Status, StatusConfig> = {
  working: {
    label: "작업 중",
    dotColor: "bg-success-500",
    bgColor: "bg-success-50 dark:bg-success-500/10",
    textColor: "text-success-600 dark:text-success-500",
  },
  idle: {
    label: "대기 중",
    dotColor: "bg-[var(--text-muted)]",
    bgColor: "bg-[var(--bg-muted)]",
    textColor: "text-[var(--text-secondary)]",
  },
  paused: {
    label: "일시정지",
    dotColor: "bg-warning-500",
    bgColor: "bg-warning-50 dark:bg-warning-500/10",
    textColor: "text-warning-600 dark:text-warning-500",
  },
  error: {
    label: "문제 발생",
    dotColor: "bg-danger-500",
    bgColor: "bg-danger-50 dark:bg-danger-500/10",
    textColor: "text-danger-600 dark:text-danger-500",
  },
  done: {
    label: "완료",
    dotColor: "bg-success-500",
    bgColor: "bg-success-50 dark:bg-success-500/10",
    textColor: "text-success-600 dark:text-success-500",
  },
  in_progress: {
    label: "진행 중",
    dotColor: "bg-primary-500",
    bgColor: "bg-primary-100 dark:bg-primary-900/30",
    textColor: "text-primary-600 dark:text-primary-400",
  },
  open: {
    label: "대기 중",
    dotColor: "bg-[var(--text-muted)]",
    bgColor: "bg-[var(--bg-muted)]",
    textColor: "text-[var(--text-secondary)]",
  },
  backlog: {
    label: "대기 중",
    dotColor: "bg-[var(--text-muted)]",
    bgColor: "bg-[var(--bg-muted)]",
    textColor: "text-[var(--text-secondary)]",
  },
  todo: {
    label: "대기 중",
    dotColor: "bg-[var(--text-muted)]",
    bgColor: "bg-[var(--bg-muted)]",
    textColor: "text-[var(--text-secondary)]",
  },
  in_review: {
    label: "검토 중",
    dotColor: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  cancelled: {
    label: "취소",
    dotColor: "bg-[var(--text-muted)]",
    bgColor: "bg-[var(--bg-muted)]",
    textColor: "text-[var(--text-secondary)]",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] ?? statusMap.idle;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgColor,
        config.textColor,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}
