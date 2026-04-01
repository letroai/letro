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

type FilterValue = "all" | "in_progress" | "waiting" | "done";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행 중" },
  { value: "waiting", label: "대기 중" },
  { value: "done", label: "완료" },
];

export default function Tasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
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
        <ProjectHeader title="작업 목록" />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ProjectHeader title="작업 목록" />
        <SimpleErrorMessage
          message="작업 목록을 불러올 수 없어요."
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
      <ProjectHeader title="작업 목록" />

      <div className="p-6 space-y-4">
        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
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
                ? "아직 작업이 없어요. 프로젝트가 시작되면 자동으로 만들어져요."
                : "해당 상태의 작업이 없어요."
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(
              ([status, statusTasks]) =>
                statusTasks.length > 0 && (
                  <section key={status} className="space-y-2">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                      {statusLabel(status)} ({statusTasks.length})
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

function groupByStatus(tasks: Task[]): [string, Task[]][] {
  const order = [
    "in_progress",
    "in_review",
    "review",
    "todo",
    "backlog",
    "open",
    "blocked",
    "done",
    "cancelled",
  ];
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = map.get(t.status) ?? [];
    list.push(t);
    map.set(t.status, list);
  }
  // Show groups in order, plus any unknown statuses at the end
  const result: [string, Task[]][] = [];
  for (const s of order) {
    if (map.has(s)) { result.push([s, map.get(s)!]); map.delete(s); }
  }
  for (const [s, list] of map) { result.push([s, list]); }
  return result;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: "대기 중",
    todo: "대기 중",
    backlog: "대기 중",
    in_progress: "진행 중",
    review: "검토 중",
    in_review: "검토 중",
    done: "완료",
    cancelled: "취소",
    blocked: "차단됨",
  };
  return labels[status] ?? status;
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

function priorityLabel(priority: Task["priority"]): string {
  const labels: Record<Task["priority"], string> = {
    low: "낮음",
    medium: "보통",
    high: "높음",
    urgent: "긴급",
  };
  return labels[priority];
}

/* ── Sub-components ──────────────────────────────────────────────── */

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 hover:border-[var(--border-hover)] hover:shadow-sm transition-all text-left"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {task.title}
          </p>
          <Badge variant={priorityBadgeVariant(task.priority)}>
            {priorityLabel(task.priority)}
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
