import { Component, type ReactNode, useState, useEffect } from "react";

// Error Boundary — catches render errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "monospace", fontSize: 12, background: "#1a1a2e", color: "#e94560", minHeight: "100dvh", overflow: "auto" }}>
          <h2 style={{ color: "#fff", marginBottom: 8 }}>UI Error</h2>
          <p style={{ color: "#e94560", fontWeight: "bold" }}>{this.state.error.message}</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#ccc", marginTop: 8, fontSize: 10 }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 16, padding: "8px 16px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6, fontSize: 14 }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Console log overlay — shows console.error/warn on screen
export function DevConsoleOverlay() {
  const [logs, setLogs] = useState<Array<{ level: string; msg: string; time: string }>>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    const addLog = (level: string, args: unknown[]) => {
      const msg = args.map(a => {
        if (a instanceof Error) return `${a.message}\n${a.stack}`;
        if (typeof a === "object") try { return JSON.stringify(a, null, 1); } catch { return String(a); }
        return String(a);
      }).join(" ");
      const time = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-30), { level, msg, time }]);
    };

    console.error = (...args: unknown[]) => { addLog("ERROR", args); origError.apply(console, args); };
    console.warn = (...args: unknown[]) => { addLog("WARN", args); origWarn.apply(console, args); };

    // Catch unhandled errors
    const onError = (e: ErrorEvent) => addLog("UNCAUGHT", [e.message, e.filename, e.lineno]);
    const onRejection = (e: PromiseRejectionEvent) => addLog("PROMISE", [e.reason]);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      console.error = origError;
      console.warn = origWarn;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const errorCount = logs.filter(l => l.level === "ERROR" || l.level === "UNCAUGHT" || l.level === "PROMISE").length;

  return (
    <>
      {/* Floating badge */}
      <button
        onClick={() => setVisible(v => !v)}
        style={{
          position: "fixed", bottom: 70, right: 12, zIndex: 9999,
          width: 36, height: 36, borderRadius: "50%",
          background: errorCount > 0 ? "#e94560" : "#333",
          color: "#fff", border: "none", fontSize: 11, fontWeight: "bold",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,.3)",
        }}
      >
        {errorCount > 0 ? errorCount : "🔧"}
      </button>

      {/* Log panel */}
      {visible && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998,
          maxHeight: "60dvh", overflow: "auto",
          background: "#1a1a2e", color: "#ccc", fontFamily: "monospace", fontSize: 10,
          borderTop: "2px solid #e94560", padding: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#fff", fontWeight: "bold" }}>Console ({logs.length})</span>
            <button onClick={() => setLogs([])} style={{ color: "#e94560", background: "none", border: "none", fontSize: 10 }}>Clear</button>
          </div>
          {logs.length === 0 && <p style={{ color: "#666" }}>No logs yet</p>}
          {logs.map((log, i) => (
            <div key={i} style={{ borderBottom: "1px solid #333", padding: "4px 0", wordBreak: "break-all" }}>
              <span style={{ color: log.level === "ERROR" || log.level === "UNCAUGHT" || log.level === "PROMISE" ? "#e94560" : "#f59e0b" }}>
                [{log.time} {log.level}]
              </span>{" "}
              <span style={{ whiteSpace: "pre-wrap" }}>{log.msg}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
