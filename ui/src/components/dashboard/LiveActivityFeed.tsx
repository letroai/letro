import { useState, useEffect, useRef } from "react";
import { Star, User, Loader2 } from "lucide-react";

interface ActivityEvent {
  agentName: string;
  agentRole: "leader" | "member";
  message: string;
  timestamp: string;
}

export function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const me = e as MessageEvent;
        const data = JSON.parse(me.data as string);
        if (data.type === "activity") {
          setEvents((prev) => [
            ...prev.slice(-50),
            {
              agentName: data.agentName as string,
              agentRole: data.agentRole as "leader" | "member",
              message: data.message as string,
              timestamp: data.timestamp as string,
            },
          ]);
        }
      } catch {
        // Ignore parse failures
      }
    };

    window.addEventListener("letro-ws-message", handler);
    return () => window.removeEventListener("letro-ws-message", handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            실시간 활동
          </h3>
        </div>
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
          실시간 활동
        </h3>
        <span className="text-xs text-[var(--text-muted)]">
          {events.length}개
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {events.map((event, i) => {
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
