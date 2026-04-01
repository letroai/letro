import { Identity } from "@/components/shared/Identity";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

interface TeamMemberActivity {
  id: string;
  name: string;
  status: "working" | "idle" | "paused" | "error";
  currentTask?: string;
}

interface TeamActivitySectionProps {
  members: TeamMemberActivity[];
  className?: string;
}

export function TeamActivitySection({
  members,
  className,
}: TeamActivitySectionProps) {
  if (members.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        팀 현황
      </h3>
      <ul className="flex flex-col gap-1">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Identity name={member.name} type="agent" size="sm" />
            <span className="text-sm font-medium text-[var(--text-primary)] shrink-0">
              {member.name}
            </span>
            <StatusBadge status={member.status} />
            {member.currentTask && (
              <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">
                {member.currentTask}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
