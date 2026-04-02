import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Code,
  ChevronRight,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    shouldAutoScroll.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  useEffect(() => {
    getTaskOutput(projectId, taskId)
      .then((data) => {
        if (data.output) setOutput(data.output);
      })
      .catch(() => {});
  }, [projectId, taskId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data) as Record<
        string,
        unknown
      >;
      if (data["type"] === "task:output" && data["taskId"] === taskId) {
        setOutput((prev) => prev + (data["chunk"] as string));
      }
    };
    window.addEventListener("letro-ws-message", handler);
    return () => window.removeEventListener("letro-ws-message", handler);
  }, [taskId]);

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

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[480px] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 space-y-2 text-sm text-[var(--text-primary)] leading-relaxed"
      >
        {output ? (
          <RefinedOutput text={output} />
        ) : (
          <span className="text-[var(--text-muted)]">
            팀원이 작업을 준비하고 있어요...
          </span>
        )}
      </div>
    </section>
  );
}

/* ── Refined Output ────────────────────────────────────────────── */

/**
 * Parses raw Claude output and renders it with code blocks collapsed.
 * Text is shown normally; code/JSON blocks become expandable summaries.
 */
function RefinedOutput({ text }: { text: string }) {
  const segments = useMemo(() => parseOutputSegments(text), [text]);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <p key={i} className="whitespace-pre-wrap break-words">
            {seg.content}
          </p>
        ) : (
          <CollapsedCodeBlock
            key={i}
            lang={seg.lang}
            content={seg.content}
            lineCount={seg.lineCount}
          />
        ),
      )}
    </>
  );
}

type Segment =
  | { type: "text"; content: string }
  | { type: "code"; lang: string; content: string; lineCount: number };

function parseOutputSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRe.exec(raw)) !== null) {
    const textBefore = raw.slice(lastIndex, match.index).trim();
    if (textBefore) {
      segments.push({ type: "text", content: textBefore });
    }

    const lang = match[1] || "code";
    const code = match[2]!;
    const lineCount = code.split("\n").filter((l) => l.trim()).length;
    segments.push({ type: "code", lang, content: code, lineCount });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text (or incomplete code block still streaming)
  const remaining = raw.slice(lastIndex).trim();
  if (remaining) {
    // If it starts with ``` it's an incomplete code block being streamed
    if (remaining.startsWith("```")) {
      const firstNewline = remaining.indexOf("\n");
      const lang = firstNewline > 3 ? remaining.slice(3, firstNewline) : "code";
      const partial = firstNewline > 0 ? remaining.slice(firstNewline + 1) : "";
      const lineCount = partial.split("\n").filter((l) => l.trim()).length;
      segments.push({ type: "code", lang, content: partial, lineCount });
    } else {
      segments.push({ type: "text", content: remaining });
    }
  }

  return segments;
}

function CollapsedCodeBlock({
  lang,
  content,
  lineCount,
}: {
  lang: string;
  content: string;
  lineCount: number;
}) {
  const [open, setOpen] = useState(false);
  const preview = content.split("\n").find((l) => l.trim())?.trim().slice(0, 60) || "";

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-hover)] transition-colors"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <Code className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="font-medium text-[var(--text-secondary)]">
          {lang}
        </span>
        <span className="text-[var(--text-muted)] truncate flex-1">
          {preview}{preview.length >= 60 ? "..." : ""}
        </span>
        <span className="text-[var(--text-muted)] shrink-0">
          {lineCount}줄
        </span>
      </button>
      {open && (
        <pre className="px-3 py-2 border-t border-[var(--border-default)] bg-gray-950 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
          {content}
        </pre>
      )}
    </div>
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
