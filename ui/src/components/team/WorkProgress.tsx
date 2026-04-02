import { CheckCircle2, Coffee } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

interface CompletedTask {
  id: string;
  title: string;
  completedAt: string;
}

interface WorkProgressProps {
  currentTask?: string;
  completedTasks: CompletedTask[];
  className?: string;
}

export function WorkProgress({
  currentTask,
  completedTasks,
  className,
}: WorkProgressProps) {
  const { locale } = useLocale();
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        작업 현황
      </h3>

      {/* Current task */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-muted)]">
        {currentTask ? (
          <>
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse-dot shrink-0" />
            <span className="text-sm text-[var(--text-primary)]">
              {currentTask}
            </span>
          </>
        ) : (
          <>
            <Coffee className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">
              쉬고 있어요
            </span>
          </>
        )}
      </div>

      {/* Recently completed */}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            최근 완료
          </p>
          <ul className="flex flex-col gap-0.5">
            {completedTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-success-500 shrink-0" />
                <span className="flex-1 text-[var(--text-secondary)] truncate">
                  {task.title}
                </span>
                <span className="text-xs text-[var(--text-muted)] shrink-0">
                  {formatTimeAgo(task.completedAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
