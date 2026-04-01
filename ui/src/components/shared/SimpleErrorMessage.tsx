import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleErrorMessageProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function SimpleErrorMessage({
  message,
  onRetry,
  className,
}: SimpleErrorMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
    >
      <AlertCircle className="w-10 h-10 text-danger-500" />
      <p className="text-base font-medium text-[var(--text-primary)]">
        문제가 생겼어요
      </p>
      {message && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm">
          {message}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
