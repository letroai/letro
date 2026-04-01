import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface IdeaInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  className?: string;
}

export function IdeaInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  className,
}: IdeaInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && value.trim()) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, value],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="어떤 걸 만들고 싶으세요?"
        disabled={disabled}
        rows={3}
        className={cn(
          "w-full resize-none rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3",
          "text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
          "transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className={cn(
          "self-end px-6 py-2.5 text-sm font-semibold rounded-lg",
          "bg-primary-500 text-white hover:bg-primary-600 transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        시작하기
      </button>
    </div>
  );
}
