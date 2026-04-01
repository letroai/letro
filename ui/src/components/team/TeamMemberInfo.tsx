import { Identity } from "@/components/shared/Identity";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamMemberInfoProps {
  name: string;
  role: string;
  status: "working" | "idle" | "paused" | "error";
  description?: string;
  className?: string;
}

export function TeamMemberInfo({
  name,
  role,
  status,
  description,
  className,
}: TeamMemberInfoProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Identity name={name} type="agent" size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-[var(--text-primary)] truncate">
            {name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{role}</Badge>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
      {description && (
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            설명
          </p>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      )}
    </div>
  );
}
