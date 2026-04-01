import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  options: FilterOption[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterBar({ options, selected, onChange, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto scrollbar-none p-1 rounded-lg bg-[var(--bg-muted)]",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
            selected === opt.value
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
