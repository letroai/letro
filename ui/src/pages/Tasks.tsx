import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { listTasks, type Task } from "@/api/issues";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import { ClipboardList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

type FilterValue = "all" | "in_progress" | "waiting" | "done";

export default function Tasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [filter, setFilter] = useState<FilterValue>("all");

  const {
    data: tasks,
    isLoading,
    error,
    refetch,
  } = useQuery<Task[]>({
    queryKey: queryKeys.tasks.list(projectId!),
    queryFn: () => listTasks(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "작업 목록" : "Tasks"} />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "작업 목록" : "Tasks"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "작업 목록을 불러올 수 없어요." : "Failed to load tasks."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const allTasks = tasks ?? [];
  const waitingStatuses = ["todo", "backlog", "open"];
  const filtered =
    filter === "all"
      ? allTasks
      : filter === "waiting"
        ? allTasks.filter((t) => waitingStatuses.includes(t.status))
        : allTasks.filter((t) => t.status === filter);

  // Group tasks by status for display
  const grouped = groupByStatus(filtered);

  return (
    <div>
      <ProjectHeader title={locale === "ko" ? "작업 목록" : "Tasks"} />

      <div className="p-6 space-y-4">
        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { value: "all" as FilterValue, label: locale === "ko" ? "전체" : "All" },
            { value: "in_progress" as FilterValue, label: locale === "ko" ? "진행 중" : "In Progress" },
            { value: "waiting" as FilterValue, label: locale === "ko" ? "대기 중" : "Waiting" },
            { value: "done" as FilterValue, label: locale === "ko" ? "완료" : "Done" },
          ]).map((f) => {
            const count =
              f.value === "all"
                ? allTasks.length
                : f.value === "waiting"
                  ? allTasks.filter((t) => waitingStatuses.includes(t.status)).length
                  : allTasks.filter((t) => t.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary-500 text-white"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                )}
              >
                {f.label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Task List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            message={
              filter === "all"
                ? (locale === "ko" ? "아직 작업이 없어요. 프로젝트가 시작되면 자동으로 만들어져요." : "No tasks yet. Tasks will be created automatically when the project starts.")
                : (locale === "ko" ? "해당 상태의 작업이 없어요." : "No tasks with this status.")
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(
              ([status, statusTasks]) =>
                statusTasks.length > 0 && (
                  <section key={status} className="space-y-2">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                      {statusLabel(status, locale)} ({statusTasks.length})
                    </h3>
                    <div className="space-y-1">
                      {statusTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onClick={() =>
                            navigate(`/p/${projectId}/tasks/${task.id}`)
                          }
                        />
                      ))}
                    </div>
                  </section>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Maps internal statuses to display group keys so todo/backlog/open merge into one "waiting" group. */
const STATUS_GROUP: Record<string, string> = {
  in_progress: "in_progress",
  in_review: "in_review",
  review: "in_review",
  todo: "waiting",
  backlog: "waiting",
  open: "waiting",
  blocked: "blocked",
  done: "done",
  cancelled: "cancelled",
};

function groupByStatus(tasks: Task[]): [string, Task[]][] {
  const order = ["in_progress", "in_review", "waiting", "blocked", "done", "cancelled"];
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const group = STATUS_GROUP[t.status] ?? t.status;
    const list = map.get(group) ?? [];
    list.push(t);
    map.set(group, list);
  }
  const result: [string, Task[]][] = [];
  for (const s of order) {
    if (map.has(s)) { result.push([s, map.get(s)!]); map.delete(s); }
  }
  for (const [s, list] of map) { result.push([s, list]); }
  return result;
}

function statusLabel(status: string, locale: string = "ko"): string {
  const labels: Record<string, { ko: string; en: string }> = {
    waiting: { ko: "대기 중", en: "Waiting" },
    in_progress: { ko: "진행 중", en: "In Progress" },
    in_review: { ko: "검토 중", en: "In Review" },
    done: { ko: "완료", en: "Done" },
    cancelled: { ko: "취소", en: "Cancelled" },
    blocked: { ko: "차단됨", en: "Blocked" },
  };
  const entry = labels[status];
  return entry ? (locale === "ko" ? entry.ko : entry.en) : status;
}

function priorityBadgeVariant(
  priority: Task["priority"],
): "default" | "warning" | "danger" | "outline" {
  const map: Record<Task["priority"], "default" | "warning" | "danger" | "outline"> = {
    low: "outline",
    medium: "default",
    high: "warning",
    urgent: "danger",
  };
  return map[priority];
}

function priorityLabel(priority: Task["priority"], locale: string = "ko"): string {
  const labels: Record<Task["priority"], { ko: string; en: string }> = {
    low: { ko: "낮음", en: "Low" },
    medium: { ko: "보통", en: "Medium" },
    high: { ko: "높음", en: "High" },
    urgent: { ko: "긴급", en: "Urgent" },
  };
  const entry = labels[priority];
  return locale === "ko" ? entry.ko : entry.en;
}

/* ── Sub-components ──────────────────────────────────────────────── */

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const { locale } = useLocale();
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 hover:border-[var(--border-hover)] hover:shadow-sm transition-all text-left"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate min-w-0 flex-1">
            {task.title}
          </p>
          <Badge variant={priorityBadgeVariant(task.priority)} className="shrink-0 whitespace-nowrap">
            {priorityLabel(task.priority, locale)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {task.assigneeName && (
            <span className="inline-flex items-center gap-1">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[9px] font-bold shrink-0">
                {task.assigneeName.charAt(0)}
              </span>
              <span>{task.assigneeName}</span>
            </span>
          )}
          {task.assigneeName && <span>&middot;</span>}
          <span>{formatTimeAgo(task.updatedAt)}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 ml-2" />
    </button>
  );
}
