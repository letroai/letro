import { useState } from "react";
import { ChevronRight, Target } from "lucide-react";
import { GoalProgressBar } from "./GoalProgressBar";
import { cn } from "@/lib/utils";

interface GoalNode {
  id: string;
  title: string;
  completed: number;
  total: number;
  children?: GoalNode[];
}

interface GoalTreeProps {
  goals: GoalNode[];
  className?: string;
}

export function GoalTree({ goals, className }: GoalTreeProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {goals.map((goal) => (
        <GoalTreeItem key={goal.id} goal={goal} depth={0} />
      ))}
    </div>
  );
}

interface GoalTreeItemProps {
  goal: GoalNode;
  depth: number;
}

function GoalTreeItem({ goal, depth }: GoalTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded hover:bg-[var(--bg-muted)] transition-colors"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 text-[var(--text-muted)] transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <Target className="w-4 h-4 text-[var(--text-muted)] ml-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] truncate">
            {goal.title}
          </p>
          <GoalProgressBar
            completed={goal.completed}
            total={goal.total}
            className="mt-1"
          />
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {goal.children!.map((child) => (
            <GoalTreeItem key={child.id} goal={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
