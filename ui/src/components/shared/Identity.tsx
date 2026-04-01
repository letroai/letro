import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdentityProps {
  name: string;
  type: "agent" | "user";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
} as const;

const iconSizes = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
} as const;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Identity({ name, type, size = "md", className }: IdentityProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full shrink-0 font-medium",
        type === "agent"
          ? "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
          : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        sizeClasses[size],
        className,
      )}
      title={name}
    >
      {type === "agent" ? (
        <Bot className={iconSizes[size]} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
