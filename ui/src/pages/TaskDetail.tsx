import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import {
  getTask,
  getComments,
  addComment,
  getTaskOutput,
  type Task,
  type Comment,
} from "@/api/issues";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/format";
import {
  User,
  Bot,
  Send,
  Loader2,
  Clock,
  AlertTriangle,
  Terminal,
} from "lucide-react";

export default function TaskDetail() {
  const { projectId, taskId } = useParams<{
    projectId: string;
    taskId: string;
  }>();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const {
    data: task,
    isLoading: taskLoading,
    error: taskError,
    refetch: refetchTask,
  } = useQuery<Task>({
    queryKey: queryKeys.tasks.detail(projectId!, taskId!),
    queryFn: () => getTask(projectId!, taskId!),
    enabled: !!projectId && !!taskId,
  });

  const {
    data: comments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useQuery<Comment[]>({
    queryKey: queryKeys.tasks.comments(projectId!, taskId!),
    queryFn: () => getComments(projectId!, taskId!),
    enabled: !!projectId && !!taskId,
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(projectId!, taskId!, content),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.comments(projectId!, taskId!),
      });
    },
  });

  const handleSubmitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    commentMutation.mutate(trimmed);
  };

  if (taskLoading) {
    return (
      <div>
        <ProjectHeader title="작업" />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div>
        <ProjectHeader title="작업" />
        <SimpleErrorMessage
          message="작업 정보를 불러올 수 없어요."
          onRetry={() => refetchTask()}
        />
      </div>
    );
  }

  const isInProgress = task.status === "in_progress";

  return (
    <div>
      <ProjectHeader title={task.title} />

      <div className="p-6 space-y-6">
        {/* Task Info */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>

          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {task.title}
          </h2>

          {task.description && (
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-[var(--border-default)] text-sm text-[var(--text-muted)]">
            {task.assigneeName && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{task.assigneeName}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>생성: {formatTimeAgo(task.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>수정: {formatTimeAgo(task.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Live Output (only when task is in progress) */}
        {isInProgress && (
          <LiveTaskOutput projectId={projectId!} taskId={taskId!} />
        )}

        {/* Comment Thread */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            대화
          </h3>

          {commentsLoading ? (
            <PageSkeleton variant="list" />
          ) : commentsError ? (
            <SimpleErrorMessage message="대화를 불러올 수 없어요." />
          ) : (
            <>
              {/* Comment list */}
              <div className="space-y-3">
                {(comments ?? []).length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    아직 대화가 없어요.
                  </p>
                )}
                {(comments ?? []).map((comment) => (
                  <CommentBubble key={comment.id} comment={comment} />
                ))}
              </div>

              {/* Comment input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={
                    !commentText.trim() || commentMutation.isPending
                  }
                  className="flex items-center justify-center rounded-lg bg-primary-500 px-4 py-2.5 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              {commentMutation.error && (
                <p className="text-xs text-danger-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  메시지를 보내지 못했어요. 다시 시도해 주세요.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Live Task Output ──────────────────────────────────────────── */

function LiveTaskOutput({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const [output, setOutput] = useState("");
  const containerRef = useRef<HTMLPreElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    shouldAutoScroll.current = isAtBottom;
  }, []);

  // Fetch accumulated output on mount
  useEffect(() => {
    getTaskOutput(projectId, taskId).then((data) => {
      if (data.output) setOutput(data.output);
    }).catch(() => {});
  }, [projectId, taskId]);

  // Listen for streaming chunks via WebSocket
  useEffect(() => {
    const handler = (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data) as Record<string, unknown>;
      if (data["type"] === "task:output" && data["taskId"] === taskId) {
        setOutput((prev) => prev + (data["chunk"] as string));
      }
    };

    window.addEventListener("letro-ws-message", handler);
    return () => window.removeEventListener("letro-ws-message", handler);
  }, [taskId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          실시간 작업 출력
        </h3>
        <span className="inline-flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
          </span>
          진행 중
        </span>
      </div>

      <pre
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[480px] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-gray-950 p-4 text-sm text-gray-200 font-mono leading-relaxed whitespace-pre-wrap break-words"
      >
        {output || (
          <span className="text-gray-500">팀원이 작업을 준비하고 있어요...</span>
        )}
      </pre>
    </section>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function CommentBubble({ comment }: { comment: Comment }) {
  const isHuman = comment.authorType === "human";

  return (
    <div
      className={`flex gap-3 ${isHuman ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
          isHuman
            ? "bg-primary-100 dark:bg-primary-900/30"
            : "bg-[var(--bg-tertiary)]"
        }`}
      >
        {isHuman ? (
          <User className="w-4 h-4 text-primary-500" />
        ) : (
          <Bot className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
          isHuman
            ? "bg-primary-500 text-white"
            : "border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
        }`}
      >
        <p className="text-xs font-medium mb-1 opacity-70">
          {comment.authorName}
        </p>
        <p className="text-sm whitespace-pre-line">{comment.content}</p>
        <p
          className={`text-xs mt-1.5 ${
            isHuman ? "text-white/60" : "text-[var(--text-muted)]"
          }`}
        >
          {formatTimeAgo(comment.createdAt)}
        </p>
      </div>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "outline" }> = {
    open: { label: "대기 중", variant: "outline" },
    backlog: { label: "대기 중", variant: "outline" },
    todo: { label: "대기 중", variant: "outline" },
    in_progress: { label: "진행 중", variant: "default" },
    review: { label: "검토 중", variant: "warning" },
    in_review: { label: "검토 중", variant: "warning" },
    done: { label: "완료", variant: "success" },
    blocked: { label: "차단됨", variant: "danger" },
    cancelled: { label: "취소", variant: "outline" },
  };

  const { label, variant } = config[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function TaskPriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; variant: "default" | "warning" | "danger" | "outline" }> = {
    low: { label: "낮음", variant: "outline" },
    medium: { label: "보통", variant: "default" },
    high: { label: "높음", variant: "warning" },
    urgent: { label: "긴급", variant: "danger" },
    critical: { label: "긴급", variant: "danger" },
  };

  const { label, variant } = config[priority] ?? { label: priority, variant: "outline" as const };
  return <Badge variant={variant}>{label}</Badge>;
}
