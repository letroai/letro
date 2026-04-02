import { useRef, useEffect, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Identity } from "@/components/shared/Identity";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

interface Comment {
  id: string;
  author: string;
  authorType: "agent" | "user";
  text: string;
  createdAt: string;
}

interface CommentThreadProps {
  comments: Comment[];
  onSubmit: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CommentThread({
  comments,
  onSubmit,
  disabled = false,
  className,
}: CommentThreadProps) {
  const { locale } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setDraft("");
  }, [draft, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden",
        className,
      )}
    >
      {/* Comment list */}
      <div
        ref={listRef}
        className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto max-h-80"
      >
        {comments.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            아직 대화가 없어요
          </p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2">
            <Identity
              name={comment.author}
              type={comment.authorType}
              size="sm"
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {comment.author}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatTimeAgo(comment.createdAt, locale)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 whitespace-pre-wrap break-words">
                {comment.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-[var(--border-default)]">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          disabled={disabled}
          className={cn(
            "flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
            "outline-none disabled:opacity-50",
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !draft.trim()}
          className="p-1.5 rounded-md text-primary-500 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
          aria-label="보내기"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
