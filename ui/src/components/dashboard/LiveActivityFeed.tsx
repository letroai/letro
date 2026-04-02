import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, User } from "lucide-react";
import { api } from "@/api/client";

interface ActivityEvent {
  agentName: string;
  agentRole: "leader" | "member";
  message: string;
  timestamp: string;
}

interface DBNotification {
  id: string;
  kind: string;
  summary: string | null;
  details: Record<string, unknown> | null;
  agentId: string | null;
  occurredAt: string;
}

function dbToEvent(n: DBNotification): ActivityEvent | null {
  if (n.kind !== "activity") return null;
  const details = n.details ?? {};
  return {
    agentName: (details.agentName as string) ?? "팀원",
    agentRole: (details.agentRole as "leader" | "member") ?? "member",
    message: (details.message as string) ?? n.summary ?? "",
    timestamp: (details.timestamp as string) ?? n.occurredAt,
  };
}

export function LiveActivityFeed() {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load past events from DB
  const { data: pastNotifications } = useQuery<DBNotification[]>({
    queryKey: ["notifications", "feed"],
    queryFn: () => api.get<DBNotification[]>("/notifications", { limit: 30 }),
    staleTime: 30_000,
  });

  const pastEvents: ActivityEvent[] = (pastNotifications ?? [])
    .map(dbToEvent)
    .filter((e): e is ActivityEvent => e !== null)
    .reverse(); // DB returns desc, we want asc

  // Listen for real-time events
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const data = JSON.parse((e as MessageEvent).data as string);
        if (data.type === "activity") {
          setLiveEvents((prev) => [
            ...prev.slice(-50),
            {
              agentName: data.agentName as string,
              agentRole: data.agentRole as "leader" | "member",
              message: data.message as string,
              timestamp: data.timestamp as string,
            },
          ]);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("letro-ws-message", handler);
    return () => window.removeEventListener("letro-ws-message", handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveEvents]);

  // Merge past (from DB) + live (from WebSocket), deduplicate by message+time
  const allEvents = [...pastEvents, ...liveEvents];
  const seen = new Set<string>();
  const deduped = allEvents.filter((e) => {
    const key = `${e.message}|${e.timestamp}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          활동 내역
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          팀이 작업을 시작하면 여기에 나타나요...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          활동 내역
        </h3>
        <span className="text-xs text-[var(--text-muted)]">
          {deduped.length}개
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {deduped.map((event, i) => {
          const time = new Date(event.timestamp).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const isLeader = event.agentRole === "leader";
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5 ${
                  isLeader
                    ? "bg-primary-100 dark:bg-primary-900/30"
                    : "bg-success-50 dark:bg-success-500/10"
                }`}
              >
                {isLeader ? (
                  <Star className="w-3 h-3 text-primary-500" />
                ) : (
                  <User className="w-3 h-3 text-success-500" />
                )}
              </span>
              <div className="min-w-0">
                <span className="font-medium text-[var(--text-primary)]">
                  {event.agentName}
                </span>
                <span className="text-[var(--text-muted)]"> · {time}</span>
                <p className="text-[var(--text-secondary)] mt-0.5">
                  {event.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
