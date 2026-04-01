import { cn } from "@/lib/utils";

interface GoalProgressBarProps {
  completed: number;
  total: number;
  className?: string;
}

export function GoalProgressBar({
  completed,
  total,
  className,
}: GoalProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = pct >= 100;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isComplete ? "bg-success-500" : "bg-primary-500",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)]">
        {total}개 중 {completed}개 완료
      </span>
    </div>
  );
}
