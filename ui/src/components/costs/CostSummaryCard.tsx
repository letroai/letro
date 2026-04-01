import { DollarSign } from "lucide-react";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CostSummaryCardProps {
  currentCents: number;
  limitCents?: number;
  className?: string;
}

export function CostSummaryCard({
  currentCents,
  limitCents,
  className,
}: CostSummaryCardProps) {
  const pct = limitCents && limitCents > 0
    ? Math.round((currentCents / limitCents) * 100)
    : 0;
  const isOver = pct > 100;
  const isNear = pct >= 80 && !isOver;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm text-[var(--text-secondary)]">
          이번 달 비용
        </span>
      </div>

      <span
        className={cn(
          "text-3xl font-bold",
          isOver
            ? "text-danger-600 dark:text-danger-500"
            : "text-[var(--text-primary)]",
        )}
      >
        {formatCost(currentCents)}
      </span>

      {limitCents != null && limitCents > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOver
                  ? "bg-danger-500"
                  : isNear
                    ? "bg-warning-500"
                    : "bg-primary-500",
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            비용 한도 {formatCost(limitCents)} 중 {pct}% 사용
          </span>
        </div>
      )}
    </div>
  );
}
