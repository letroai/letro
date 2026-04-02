// server/src/ws/websocket-server.ts
import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "node:http";
import { WS_PING_INTERVAL_MS } from "../lib/defaults.js";

const subscriptions = new Map<string, Set<WebSocket>>();
const projectSubscriptions = new Map<string, Set<WebSocket>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupWebSocketServer(httpServer: any): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/api/ws",
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const companyId = url.searchParams.get("companyId");

    if (!companyId) {
      ws.close(4001, "companyId required");
      return;
    }

    if (!subscriptions.has(companyId)) {
      subscriptions.set(companyId, new Set());
    }
    subscriptions.get(companyId)!.add(ws);

    ws.send(JSON.stringify({
      type: "connected",
      companyId,
      timestamp: new Date().toISOString(),
    }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (msg["type"] === "subscribe_project" && typeof msg["projectId"] === "string") {
          const key = `${companyId}:${msg["projectId"]}`;
          if (!projectSubscriptions.has(key)) {
            projectSubscriptions.set(key, new Set());
          }
          projectSubscriptions.get(key)!.add(ws);
        }
        if (msg["type"] === "unsubscribe_project" && typeof msg["projectId"] === "string") {
          const key = `${companyId}:${msg["projectId"]}`;
          projectSubscriptions.get(key)?.delete(ws);
        }
      } catch { /* ignore */ }
    });

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, WS_PING_INTERVAL_MS);

    ws.on("close", () => {
      clearInterval(pingInterval);
      subscriptions.get(companyId)?.delete(ws);
      for (const [key, subs] of projectSubscriptions) {
        subs.delete(ws);
        if (subs.size === 0) projectSubscriptions.delete(key);
      }
    });

    ws.on("error", () => {
      clearInterval(pingInterval);
      subscriptions.get(companyId)?.delete(ws);
    });
  });

  return wss;
}

export interface LiveEvent {
  type: string;
  [key: string]: unknown;
}

export function publishLiveEvent(companyId: string, event: LiveEvent): void {
  const payload = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });

  // Broadcast to all connected clients.
  // In local_trusted mode the UI subscribes with companyId="default"
  // while agents publish with the actual company UUID — so we broadcast
  // to every connection to avoid mismatches.
  for (const subs of subscriptions.values()) {
    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

export function publishProjectEvent(companyId: string, projectId: string, event: LiveEvent): void {
  publishLiveEvent(companyId, event);

  const key = `${companyId}:${projectId}`;
  const subs = projectSubscriptions.get(key);
  if (subs) {
    const payload = JSON.stringify({ ...event, projectId, timestamp: new Date().toISOString() });
    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

export function getSubscriptionStats(): { companies: number; connections: number } {
  let connections = 0;
  for (const subs of subscriptions.values()) connections += subs.size;
  return { companies: subscriptions.size, connections };
}
