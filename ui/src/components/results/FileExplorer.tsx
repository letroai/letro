import { useState } from "react";
import { ChevronRight, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface FileExplorerProps {
  tree: FileNode[];
  onSelectFile?: (path: string) => void;
  className?: string;
}

export function FileExplorer({
  tree,
  onSelectFile,
  className,
}: FileExplorerProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden",
        className,
      )}
    >
      <div className="p-2">
        {tree.map((node) => (
          <FileTreeNode
            key={node.name}
            node={node}
            path={node.name}
            depth={0}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  path: string;
  depth: number;
  onSelectFile?: (path: string) => void;
}

function FileTreeNode({ node, path, depth, onSelectFile }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const isDir = node.type === "directory";

  const handleClick = () => {
    if (isDir) {
      setExpanded(!expanded);
    } else {
      onSelectFile?.(path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 w-full py-1 px-2 rounded-md text-left text-sm",
          "hover:bg-[var(--bg-hover)] transition-colors",
          !isDir && "text-[var(--text-primary)]",
          isDir && "text-[var(--text-secondary)] font-medium",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <>
            <ChevronRight
              className={cn(
                "w-3 h-3 text-[var(--text-muted)] transition-transform shrink-0",
                expanded && "rotate-90",
              )}
            />
            <Folder className="w-4 h-4 text-warning-500 shrink-0" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <File className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              path={`${path}/${child.name}`}
              depth={depth + 1}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
