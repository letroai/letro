import { Sparkles, MessageCircle, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkStyle = "autonomous" | "balanced" | "manual";

interface WorkStyleOption {
  value: WorkStyle;
  icon: LucideIcon;
  title: string;
  description: string;
  recommended?: boolean;
}

const options: WorkStyleOption[] = [
  {
    value: "autonomous",
    icon: Sparkles,
    title: "알아서 다 해줘",
    description: "팀이 알아서 작업을 진행하고, 꼭 필요할 때만 물어봐요.",
    recommended: true,
  },
  {
    value: "balanced",
    icon: MessageCircle,
    title: "중요한 건 물어봐",
    description: "중요한 결정이 필요할 때 확인을 요청해요.",
  },
  {
    value: "manual",
    icon: SlidersHorizontal,
    title: "내가 하나하나 결정할게",
    description: "모든 단계에서 확인을 받고 진행해요.",
  },
];

interface WorkStyleSelectorProps {
  selected: WorkStyle;
  onChange: (value: WorkStyle) => void;
  className?: string;
}

export function WorkStyleSelector({
  selected,
  onChange,
  className,
}: WorkStyleSelectorProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
              isSelected
                ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10"
                : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]",
            )}
          >
            {/* Radio circle */}
            <div className="mt-0.5 shrink-0">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  isSelected
                    ? "border-primary-500"
                    : "border-[var(--text-muted)]",
                )}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isSelected
                      ? "text-primary-500"
                      : "text-[var(--text-muted)]",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isSelected
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-[var(--text-primary)]",
                  )}
                >
                  {opt.title}
                </span>
                {opt.recommended && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    추천
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {opt.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
