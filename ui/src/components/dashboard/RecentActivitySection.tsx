import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  text: string;
  createdAt: string;
}

interface RecentActivitySectionProps {
  items: ActivityItem[];
  maxItems?: number;
  className?: string;
}

export function RecentActivitySection({
  items,
  maxItems = 10,
  className,
}: RecentActivitySectionProps) {
  const visible = items.slice(0, maxItems);

  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        최근 활동
      </h3>
      <ul className="flex flex-col gap-0.5">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 px-3 py-2 rounded-lg"
          >
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
            <span className="flex-1 text-sm text-[var(--text-primary)]">
              {item.text}
            </span>
            <span className="text-xs text-[var(--text-muted)] shrink-0 pt-0.5">
              {formatTimeAgo(item.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
