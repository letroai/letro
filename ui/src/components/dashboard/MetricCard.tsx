import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down";
    text: string;
  };
  className?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <span className="text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </span>
      {trend && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend.direction === "up"
              ? "text-success-600 dark:text-success-500"
              : "text-danger-600 dark:text-danger-500",
          )}
        >
          {trend.direction === "up" ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
}
