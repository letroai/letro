import { cn } from "@/lib/utils";

const examples = [
  "반려동물 건강 관리 앱",
  "팀 일정 관리 도구",
  "블로그 플랫폼",
  "가계부 앱",
  "레시피 공유 사이트",
  "독서 기록 앱",
] as const;

interface IdeaExamplesProps {
  onSelect: (idea: string) => void;
  className?: string;
}

export function IdeaExamples({ onSelect, className }: IdeaExamplesProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {examples.map((example) => (
        <button
          key={example}
          onClick={() => onSelect(example)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border border-[var(--border-default)]",
            "text-[var(--text-secondary)] bg-[var(--bg-card)]",
            "hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50",
            "dark:hover:border-primary-700 dark:hover:text-primary-400 dark:hover:bg-primary-900/20",
            "transition-colors cursor-pointer",
          )}
        >
          {example}
        </button>
      ))}
    </div>
  );
}
