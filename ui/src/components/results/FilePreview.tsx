import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  fileName: string;
  content: string;
  language?: string;
  author?: string;
  updatedAt?: string;
  className?: string;
}

export function FilePreview({
  fileName,
  content,
  language,
  author,
  updatedAt,
  className,
}: FilePreviewProps) {
  const isCode = Boolean(language) || /\.(tsx?|jsx?|py|rs|go|json|ya?ml|css|html|sh|sql)$/.test(fileName);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {fileName}
        </span>
        {language && (
          <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">
            {language}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="overflow-auto max-h-96">
        <pre
          className={cn(
            "p-4 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isCode
              ? "font-mono text-[var(--text-primary)]"
              : "text-[var(--text-secondary)]",
          )}
        >
          {content}
        </pre>
      </div>

      {/* Footer */}
      {(author || updatedAt) && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border-default)] text-xs text-[var(--text-muted)]">
          {author && <span>{author}</span>}
          {author && updatedAt && <span>·</span>}
          {updatedAt && <span>{formatTimeAgo(updatedAt)}</span>}
        </div>
      )}
    </div>
  );
}
