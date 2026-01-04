import { useEffect, useMemo, useState } from "react";
import { getFileSwitchSessions, getFileSwitchWindows } from "../../../services/Metrics-Tracking/fileSwitch.service";
import type { FileSwitchSessionSummary, FileSwitchWindow } from "../../../types/Metrics-Tracking/fileSwitch.types";
import { useAuth } from "../../../contexts/AuthContext";
import { SignInPrompt } from "../../../components/Auth/GitHubAuth";

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function FileSwitchRatePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [sessions, setSessions] = useState<FileSwitchSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [windows, setWindows] = useState<FileSwitchWindow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingWindows, setLoadingWindows] = useState(false);
  const [error, setError] = useState<string>("");

  // Load sessions for date
  useEffect(() => {
    if (!user) return; // Don't load if not authenticated
    
    let cancelled = false;
    setLoadingSessions(true);
    setError("");
    setSessions([]);
    setSelectedSessionId("");
    setWindows([]);

    getFileSwitchSessions(date, user.id)
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        if (data.length > 0) {
          setSelectedSessionId(data[0].session_id);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load sessions");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingSessions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, user]);

  // Load windows when session changes
  useEffect(() => {
    if (!selectedSessionId || !user) return;
    
    let cancelled = false;
    setLoadingWindows(true);
    setError("");
    setWindows([]);

    getFileSwitchWindows(selectedSessionId, user.id)
      .then((data) => {
        if (cancelled) return;
        setWindows(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load windows");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingWindows(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSessionId, user]);

  // Show sign-in prompt if not authenticated
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-vscode-descriptionForeground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  const computed = useMemo(() => {
    if (windows.length === 0) return null;

    const totalActivations = windows.reduce((sum, w) => sum + (w.activation_count ?? 0), 0);
    const avgRate =
      windows.reduce((sum, w) => sum + Number(w.rate_per_min || 0), 0) / windows.length;

    const start = windows[0]?.window_start;
    const end = windows[windows.length - 1]?.window_end;

    return {
      totalActivations,
      avgRate,
      start,
      end,
    };
  }, [windows]);

  return (
    <div className="space-y-4">
      {/* Sessions selector */}
      <div className="border border-vscode-panel-border rounded-xl p-3 bg-vscode-widget-bg">
        <h2 className="m-0 mb-2 text-base font-semibold text-vscode-editor-fg">File Switching Rate</h2>

        <label className="block text-xs opacity-80 mb-1.5 text-vscode-foreground">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg mb-3 focus:outline-none focus:ring-2 focus:ring-vscode-focus"
        />

        {loadingSessions ? (
          <div className="text-sm opacity-80 text-vscode-foreground">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="text-sm opacity-80 text-vscode-foreground">No sessions found for {date}.</div>
        ) : (
          <div className="grid gap-2">
            {sessions.map((s) => {
              const active = s.session_id === selectedSessionId;
              return (
                <button
                  key={s.session_id}
                  onClick={() => setSelectedSessionId(s.session_id)}
                  className={`text-left p-2.5 rounded-xl border transition-colors ${
                    active
                      ? "border-vscode-focus bg-vscode-list-active-bg text-vscode-list-active-fg"
                      : "border-vscode-panel-border bg-transparent text-vscode-editor-fg hover:bg-vscode-list-hover-bg"
                  }`}
                >
                  <div className="text-xs opacity-85">Session</div>
                  <div className="text-sm font-semibold break-all">{s.session_id}</div>
                  <div className="text-xs opacity-80 mt-1.5">
                    {fmtDateTime(s.session_start)} → {fmtDateTime(s.session_end)}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    Windows: {s.window_count}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Session detail */}
      <div className="border border-vscode-panel-border rounded-xl p-3 bg-vscode-widget-bg">
        <div className="space-y-3">
          <div>
            <h3 className="m-0 text-base font-semibold text-vscode-editor-fg">Session Detail</h3>
            <div className="text-xs opacity-80 mt-1 text-vscode-foreground">
              {selectedSessionId ? (
                <>Session ID: <span className="font-mono text-[10px]">{selectedSessionId}</span></>
              ) : (
                <>Select a session</>
              )}
            </div>
          </div>

          {computed && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total activations" value={String(computed.totalActivations)} />
              <Stat label="Avg rate/min" value={computed.avgRate.toFixed(2)} />
              <Stat label="Start" value={fmtTime(computed.start)} />
              <Stat label="End" value={fmtTime(computed.end)} />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2.5 p-2.5 rounded-lg border border-vscode-input-error-border bg-vscode-input-error-bg">
            <div className="text-sm text-vscode-input-error-fg">⚠️ {error}</div>
          </div>
        )}

        <div className="mt-3">
          {loadingWindows ? (
            <div className="text-sm opacity-80 text-vscode-foreground">Loading windows…</div>
          ) : windows.length === 0 ? (
            <div className="text-sm opacity-80 text-vscode-foreground">No window data for this session.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <Th>Window</Th>
                    <Th align="right">Count</Th>
                    <Th align="right">Rate</Th>
                    <Th>Workspace</Th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map((w) => (
                    <tr key={w.id}>
                      <Td>
                        <div className="text-xs">{fmtTime(w.window_start)}</div>
                        <div className="text-xs opacity-60">{fmtTime(w.window_end)}</div>
                      </Td>
                      <Td align="right">{w.activation_count}</Td>
                      <Td align="right">{Number(w.rate_per_min).toFixed(2)}</Td>
                      <Td className="font-mono text-[10px]">
                        {w.workspace_tag ?? "-"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-xs opacity-70 mt-2 text-vscode-foreground">
                *Activation count includes returning to the same file (A → B → A counts as 3).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat component shows a label and value in a styled box
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-vscode-panel-border rounded-xl px-2.5 py-2 min-w-[120px] bg-vscode-editor-bg">
      <div className="text-[11px] opacity-75 text-vscode-foreground">{label}</div>
      <div className="text-sm font-bold text-vscode-editor-fg">{value}</div>
    </div>
  );
}

// Th component is a styled table header cell
function Th({ children, align }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`${
        align === "right" ? "text-right" : "text-left"
      } text-xs opacity-85 px-2 py-2.5 border-b border-vscode-panel-border text-vscode-foreground`}
    >
      {children}
    </th>
  );
}

// Td component is a styled table data cell
function Td({ children, align, className }: { children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td
      className={`${
        align === "right" ? "text-right" : "text-left"
      } px-2 py-2.5 border-b border-vscode-panel-border text-sm text-vscode-editor-fg ${className || ""}`}
    >
      {children}
    </td>
  );
}
