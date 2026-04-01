import { Identity } from "@/components/shared/Identity";
import { formatCost } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MemberCost {
  id: string;
  name: string;
  costCents: number;
}

interface TeamCostBreakdownProps {
  members: MemberCost[];
  className?: string;
}

export function TeamCostBreakdown({
  members,
  className,
}: TeamCostBreakdownProps) {
  const sorted = [...members].sort((a, b) => b.costCents - a.costCents);
  const maxCost = sorted[0]?.costCents ?? 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        팀원별 비용
      </h3>
      <ul className="flex flex-col gap-2">
        {sorted.map((member) => {
          const pct = maxCost > 0 ? (member.costCents / maxCost) * 100 : 0;
          return (
            <li key={member.id} className="flex items-center gap-3">
              <Identity name={member.name} type="agent" size="sm" />
              <span className="text-sm text-[var(--text-primary)] w-24 truncate shrink-0">
                {member.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right">
                {formatCost(member.costCents)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
