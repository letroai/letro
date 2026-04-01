import { useLiveUpdates } from "@/providers/LiveUpdatesProvider";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const { connectionState } = useLiveUpdates();

  if (connectionState === "connected") return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm",
        connectionState === "connecting" && "bg-warning-50 text-warning-600",
        connectionState === "disconnected" && "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)]",
        connectionState === "error" && "bg-danger-50 text-danger-600",
      )}
      role="status"
      aria-live="polite"
    >
      {connectionState === "connecting" ? (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>연결 중...</span>
        </>
      ) : connectionState === "error" ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>연결이 끊어졌어요. 다시 시도 중...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>연결이 끊어졌어요</span>
        </>
      )}
    </div>
  );
}
