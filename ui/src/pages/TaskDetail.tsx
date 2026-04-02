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
import { useLocale } from "@/providers/LocaleProvider";

export default function TaskDetail() {
  const { projectId, taskId } = useParams<{
    projectId: string;
    taskId: string;
  }>();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
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
        <ProjectHeader title={locale === "ko" ? "작업" : "Task"} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "작업" : "Task"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "작업 정보를 불러올 수 없어요." : "Failed to load task."}
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
              <span>{locale === "ko" ? "생성:" : "Created:"} {formatTimeAgo(task.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{locale === "ko" ? "수정:" : "Updated:"} {formatTimeAgo(task.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Task Output — live when in progress, persisted when done */}
        {(isInProgress || task.status === "done") && (
          <TaskOutput projectId={projectId!} taskId={taskId!} isLive={isInProgress} />
        )}

        {/* Comment Thread */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {locale === "ko" ? "대화" : "Conversation"}
          </h3>

          {commentsLoading ? (
            <PageSkeleton variant="list" />
          ) : commentsError ? (
            <SimpleErrorMessage message={locale === "ko" ? "대화를 불러올 수 없어요." : "Failed to load conversation."} />
          ) : (
            <>
              {/* Comment list */}
              <div className="space-y-3">
                {(comments ?? []).length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    {locale === "ko" ? "아직 대화가 없어요." : "No conversation yet."}
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
                  placeholder={locale === "ko" ? "메시지를 입력하세요..." : "Type a message..."}
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
                  {locale === "ko" ? "메시지를 보내지 못했어요. 다시 시도해 주세요." : "Failed to send message. Please try again."}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Task Output (live or persisted) ───────────────────────────── */

function TaskOutput({
  projectId,
  taskId,
  isLive,
}: {
  projectId: string;
  taskId: string;
  isLive: boolean;
}) {
  const { locale } = useLocale();
  const [output, setOutput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    shouldAutoScroll.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  // Load output from server (in-memory buffer or DB)
  useEffect(() => {
    getTaskOutput(projectId, taskId)
      .then((data) => {
        if (data.output) setOutput(data.output);
      })
      .catch(() => {});
  }, [projectId, taskId]);

  // Subscribe to live streaming chunks (only when in progress)
  useEffect(() => {
    if (!isLive) return;
    const handler = (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data) as Record<string, unknown>;
      if (data["type"] === "task:output" && data["taskId"] === taskId) {
        setOutput((prev) => prev + (data["chunk"] as string));
      }
    };
    window.addEventListener("letro-ws-message", handler);
    return () => window.removeEventListener("letro-ws-message", handler);
  }, [taskId, isLive]);

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
          {isLive ? (locale === "ko" ? "실시간 작업 출력" : "Live Task Output") : (locale === "ko" ? "작업 내역" : "Task Output")}
        </h3>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
            </span>
            {locale === "ko" ? "진행 중" : "In Progress"}
          </span>
        )}
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
            {isLive
              ? (locale === "ko" ? "팀원이 작업을 준비하고 있어요..." : "Team member is preparing...")
              : (locale === "ko" ? "작업 내역이 없어요." : "No output available.")}
          </span>
        )}
      </div>
    </section>
  );
}

/* ── Refined Output ────────────────────────────────────────────── */

type Segment =
  | { type: "text"; content: string }
  | { type: "tool"; icon: string; label: string }
  | { type: "code"; lang: string; content: string; lineCount: number };

const TOOL_LINE_RE = /^(📝|✏️|💻|📖|🔍|✅)\s*(.+)$/;

function parseOutputSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRe.exec(raw)) !== null) {
    const before = raw.slice(lastIndex, match.index);
    pushTextLines(segments, before);
    const lang = match[1] || "code";
    const code = match[2]!;
    segments.push({ type: "code", lang, content: code, lineCount: code.split("\n").filter((l) => l.trim()).length });
    lastIndex = match.index + match[0].length;
  }

  const remaining = raw.slice(lastIndex);
  if (remaining.startsWith("```")) {
    const nl = remaining.indexOf("\n");
    const lang = nl > 3 ? remaining.slice(3, nl) : "code";
    const partial = nl > 0 ? remaining.slice(nl + 1) : "";
    segments.push({ type: "code", lang, content: partial, lineCount: partial.split("\n").filter((l) => l.trim()).length });
  } else {
    pushTextLines(segments, remaining);
  }
  return segments;
}

function pushTextLines(segments: Segment[], raw: string) {
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const toolMatch = TOOL_LINE_RE.exec(trimmed);
    if (toolMatch) {
      segments.push({ type: "tool", icon: toolMatch[1]!, label: toolMatch[2]! });
    } else {
      // Merge consecutive text segments
      const last = segments[segments.length - 1];
      if (last?.type === "text") {
        last.content += "\n" + trimmed;
      } else {
        segments.push({ type: "text", content: trimmed });
      }
    }
  }
}

function RefinedOutput({ text }: { text: string }) {
  const segments = useMemo(() => parseOutputSegments(text), [text]);

  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        if (seg.type === "tool") return <ToolLine key={i} icon={seg.icon} label={seg.label} />;
        if (seg.type === "code") return <CollapsedCodeBlock key={i} lang={seg.lang} content={seg.content} lineCount={seg.lineCount} />;
        return <p key={i} className="text-sm whitespace-pre-wrap break-words">{seg.content}</p>;
      })}
    </div>
  );
}

function ToolLine({ icon, label }: { icon: string; label: string }) {
  const isComplete = icon === "✅";
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
      isComplete
        ? "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
        : "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
    }`}>
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function CollapsedCodeBlock({ lang, content, lineCount }: { lang: string; content: string; lineCount: number }) {
  const [open, setOpen] = useState(false);
  const preview = content.split("\n").find((l) => l.trim())?.trim().slice(0, 60) || "";

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-hover)] transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`} />
        <Code className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="font-medium text-[var(--text-secondary)]">{lang}</span>
        <span className="text-[var(--text-muted)] truncate flex-1">{preview}{preview.length >= 60 ? "..." : ""}</span>
        <span className="text-[var(--text-muted)] shrink-0">{lineCount} {lineCount === 1 ? "line" : "lines"}</span>
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
  const { locale } = useLocale();
  const config: Record<string, { ko: string; en: string; variant: "default" | "success" | "warning" | "danger" | "outline" }> = {
    open: { ko: "대기 중", en: "Waiting", variant: "outline" },
    backlog: { ko: "대기 중", en: "Waiting", variant: "outline" },
    todo: { ko: "대기 중", en: "Waiting", variant: "outline" },
    in_progress: { ko: "진행 중", en: "In Progress", variant: "default" },
    review: { ko: "검토 중", en: "In Review", variant: "warning" },
    in_review: { ko: "검토 중", en: "In Review", variant: "warning" },
    done: { ko: "완료", en: "Done", variant: "success" },
    blocked: { ko: "차단됨", en: "Blocked", variant: "danger" },
    cancelled: { ko: "취소", en: "Cancelled", variant: "outline" },
  };

  const entry = config[status];
  const label = entry ? (locale === "ko" ? entry.ko : entry.en) : status;
  const variant = entry?.variant ?? "outline" as const;
  return <Badge variant={variant}>{label}</Badge>;
}

function TaskPriorityBadge({ priority }: { priority: string }) {
  const { locale } = useLocale();
  const config: Record<string, { ko: string; en: string; variant: "default" | "warning" | "danger" | "outline" }> = {
    low: { ko: "낮음", en: "Low", variant: "outline" },
    medium: { ko: "보통", en: "Medium", variant: "default" },
    high: { ko: "높음", en: "High", variant: "warning" },
    urgent: { ko: "긴급", en: "Urgent", variant: "danger" },
    critical: { ko: "긴급", en: "Critical", variant: "danger" },
  };

  const entry = config[priority];
  const label = entry ? (locale === "ko" ? entry.ko : entry.en) : priority;
  const variant = entry?.variant ?? "outline" as const;
  return <Badge variant={variant}>{label}</Badge>;
}
