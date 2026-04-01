import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface LiveUpdatesContextValue {
  connectionState: ConnectionState;
}

const LiveUpdatesContext = createContext<LiveUpdatesContextValue>({
  connectionState: "disconnected",
});

/**
 * Maps WebSocket event types to TanStack Query key prefixes to invalidate.
 * Uses prefixes instead of exact keys to batch-invalidate related queries.
 */
const EVENT_INVALIDATION_MAP: Record<string, string[][]> = {
  "agent:created": [["team"], ["projects"]],
  "agent:updated": [["team"]],
  "agent:hired": [["team"], ["dashboard"]],
  "agent:fired": [["team"], ["dashboard"]],
  "agent:status_changed": [["team"]],
  "issue:created": [["tasks"], ["dashboard"]],
  "issue:updated": [["tasks"]],
  "issue:status_changed": [["tasks"], ["dashboard"]],
  "issue:assigned": [["tasks"]],
  "goal:created": [["goals"]],
  "goal:updated": [["goals"]],
  "goal:progress_changed": [["goals"], ["dashboard"]],
  "project:created": [["projects"]],
  "project:updated": [["projects"]],
  "heartbeat:completed": [["dashboard"], ["activity"]],
  "cost:event": [["costs"], ["dashboard"]],
  "budget:warning": [["dashboard"]],
  "budget:exceeded": [["dashboard"]],
  "peer_review:completed": [["tasks"]],
  "approval:requested": [["dashboard"], ["notifications"]],
  "approval:resolved": [["dashboard"]],
};

export function LiveUpdatesProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { projectId } = useParams<{ projectId: string }>();
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const companyId = "default"; // MVP: single-company mode

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        const eventType = data["type"] as string;

        if (eventType === "connected") return;

        const prefixes = EVENT_INVALIDATION_MAP[eventType];
        if (prefixes) {
          for (const prefix of prefixes) {
            void queryClient.invalidateQueries({ queryKey: prefix });
          }
        }

        // Dispatch raw message so LiveActivityFeed and other listeners can consume it
        window.dispatchEvent(
          new MessageEvent("letro-ws-message", { data: event.data }),
        );
      } catch {
        // Ignore parse failures
      }
    },
    [queryClient],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/ws?companyId=${companyId}`,
    );

    ws.onopen = () => setConnectionState("connected");
    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setConnectionState("disconnected");
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setConnectionState("error");
      ws.close();
    };

    wsRef.current = ws;
  }, [companyId, handleMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !projectId) return;

    ws.send(JSON.stringify({ type: "subscribe_project", projectId }));

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe_project", projectId }));
      }
    };
  }, [projectId]);

  return (
    <LiveUpdatesContext.Provider value={{ connectionState }}>
      {children}
    </LiveUpdatesContext.Provider>
  );
}

export function useLiveUpdates() {
  return useContext(LiveUpdatesContext);
}
