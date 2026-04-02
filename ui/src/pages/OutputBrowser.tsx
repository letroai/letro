import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  getFileTree,
  getFileContent,
  type FileNode,
  type FileContent,
} from "@/api/results";
import { useLocale } from "@/providers/LocaleProvider";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Folder,
  ArrowLeft,
  FileCode,
} from "lucide-react";

export default function OutputBrowser() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLocale();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const {
    data: tree,
    isLoading: treeLoading,
    error: treeError,
    refetch: refetchTree,
  } = useQuery<FileNode[]>({
    queryKey: ["results", projectId, "tree"],
    queryFn: () => getFileTree(projectId!),
    enabled: !!projectId,
  });

  const {
    data: fileContent,
    isLoading: fileLoading,
    error: fileError,
  } = useQuery<FileContent>({
    queryKey: ["results", projectId, "file", selectedPath],
    queryFn: () => getFileContent(projectId!, selectedPath!),
    enabled: !!projectId && !!selectedPath,
  });

  const handleFileSelect = useCallback(
    (path: string) => {
      setSelectedPath(path);
      if (isMobile) setShowPreview(true);
    },
    [isMobile],
  );

  const handleBack = useCallback(() => {
    setShowPreview(false);
  }, []);

  if (treeLoading) {
    return (
      <div>
        <ProjectHeader title={t("results.title")} />
        <PageSkeleton variant="list" />
      </div>
    );
  }

  if (treeError) {
    return (
      <div>
        <ProjectHeader title={t("results.title")} />
        <SimpleErrorMessage
          message={t("results.failedLoad")}
          onRetry={() => refetchTree()}
        />
      </div>
    );
  }

  const allNodes = tree ?? [];

  if (allNodes.length === 0) {
    return (
      <div>
        <ProjectHeader title={t("results.title")} />
        <EmptyState
          icon={FolderOpen}
          message={t("results.noOutputsYet")}
        />
      </div>
    );
  }

  // Mobile: toggle between tree and preview
  if (isMobile) {
    return (
      <div>
        <ProjectHeader title={t("results.title")} />
        {showPreview && selectedPath ? (
          <div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("results.backToList")}
            </button>
            <FilePreview
              content={fileContent ?? null}
              isLoading={fileLoading}
              error={fileError}
            />
          </div>
        ) : (
          <div className="p-4">
            <FileExplorer
              nodes={allNodes}
              selectedPath={selectedPath}
              onSelect={handleFileSelect}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop: two-column layout
  return (
    <div>
      <ProjectHeader title={t("results.title")} />
      <div className="flex h-[calc(100dvh-57px)]">
        {/* Left: File tree */}
        <div className="w-64 shrink-0 border-r border-[var(--border-default)] overflow-y-auto p-4">
          <FileExplorer
            nodes={allNodes}
            selectedPath={selectedPath}
            onSelect={handleFileSelect}
          />
        </div>
        {/* Right: Preview */}
        <div className="flex-1 overflow-y-auto">
          {selectedPath ? (
            <FilePreview
              content={fileContent ?? null}
              isLoading={fileLoading}
              error={fileError}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-[var(--text-muted)]">
                {t("results.selectFile")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -- Sub-components -------------------------------------------------------- */

function FileExplorer({
  nodes,
  selectedPath,
  onSelect,
}: {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === "directory";
  const isSelected = selectedPath === node.path;

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        "w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        isSelected
          ? "bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
      )}
      style={{ paddingLeft: `${depth * 16 + 8 + 18}px` }}
    >
      <FileText className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function FilePreview({
  content,
  isLoading,
  error,
}: {
  content: FileContent | null;
  isLoading: boolean;
  error: Error | null;
}) {
  const { t } = useLocale();

  if (isLoading) {
    return <PageSkeleton variant="content" />;
  }

  if (error) {
    return (
      <SimpleErrorMessage message={t("results.fileFailedLoad")} />
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <FileCode className="w-4 h-4" />
        <span className="truncate">{content.path}</span>
        {content.language && (
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)]">
            {content.language}
          </span>
        )}
        <span className="text-xs">
          {formatFileSize(content.size)}
        </span>
      </div>
      <pre className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-primary)] overflow-x-auto whitespace-pre font-mono leading-relaxed">
        {content.content}
      </pre>
    </div>
  );
}

/* -- Helpers --------------------------------------------------------------- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
