import { useEffect, useMemo, useRef, useState } from "react";
import { postToVsCode } from "../../../utils/vscode-messaging";
import type { TodoItem, TodoStateMessage } from "../types/todo.types";

export function useTodoTracker() {
  const [projectName, setProjectName] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pendingFilePick = useRef<((filePath: string | null) => void) | null>(null);
  const didReceiveState = useRef(false);

  const openTodos = useMemo(() => {
    const now = Date.now();
    const priorityRank = (p?: TodoItem["priority"]) => {
      switch (p) {
        case "urgent":
          return 4;
        case "high":
          return 3;
        case "medium":
          return 2;
        case "low":
          return 1;
        default:
          return 0;
      }
    };

    const deadlineTs = (iso?: string | null) => {
      if (!iso) return null;
      const t = Date.parse(iso);
      return Number.isFinite(t) ? t : null;
    };

    return todos
      .filter((t) => t.status !== "resolved")
      .slice()
      .sort((a, b) => {
        const aDl = deadlineTs(a.deadlineISO);
        const bDl = deadlineTs(b.deadlineISO);
        const aOverdue = aDl !== null && aDl < now;
        const bOverdue = bDl !== null && bDl < now;

        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

        const aPr = priorityRank(a.priority);
        const bPr = priorityRank(b.priority);
        if (aPr !== bPr) return bPr - aPr;

        // Earlier deadlines should appear first. If only one has a deadline, that one comes first.
        if (aDl !== null || bDl !== null) {
          if (aDl === null) return 1;
          if (bDl === null) return -1;
          if (aDl !== bDl) return aDl - bDl;
        }

        const aUs = typeof a.urgencyScore === "number" ? a.urgencyScore : -1;
        const bUs = typeof b.urgencyScore === "number" ? b.urgencyScore : -1;
        if (aUs !== bUs) return bUs - aUs;

        // Stable-ish fallback
        return a.text.localeCompare(b.text);
      });
  }, [todos]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as TodoStateMessage;

      if (msg?.type === "TODO/STATE") {
        didReceiveState.current = true;
        setError(null);
        setProjectName(msg.payload.projectName);
        setTodos(msg.payload.todos ?? []);
      }

      if (msg?.type === "TODO/ERROR") {
        setError(msg.payload.message);
      }

      if (msg?.type === "TODO/FILE_PICKED") {
        pendingFilePick.current?.(msg.payload.filePath ?? null);
        pendingFilePick.current = null;
      }
    };

    window.addEventListener("message", handler);
    // initial fetch
    postToVsCode({ type: "TODO/GET" });

    // If the extension never responds with TODO/STATE, surface a clear error.
    // This typically means the webview messages aren't reaching the TodoDashboardViewProvider.
    const t = window.setTimeout(() => {
      if (!didReceiveState.current) {
        setError(
          "No response from extension TODO provider. Make sure you opened the 'TODO Tracker' sidebar view (busyBee.todoDashboard) and reload the extension host."
        );
      }
    }, 1200);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("message", handler);
    };
  }, []);

  function refresh() {
    postToVsCode({ type: "TODO/GET" });
  }

  function scanWorkspace() {
    postToVsCode({ type: "TODO/SCAN" });
  }

  function syncProject() {
    postToVsCode({ type: "TODO/SYNC_PROJECT" });
  }

  function addManualTodo(payload: {
    text: string;
    filePath: string;
    line: number;
    status?: "open" | "in_progress" | "resolved";
    priority?: "low" | "medium" | "high" | "urgent";
    labels?: string[];
    deadlineISO?: string | null;
    urgencyScore?: number; // accept 0..100 (UI) or 0..1; extension normalizes
  }) {
    postToVsCode({ type: "TODO/ADD_MANUAL", payload });
  }

  function markResolved(id: string) {
    postToVsCode({ type: "TODO/MARK_RESOLVED", payload: { id } });
  }

  function openFile(filePath: string, line?: number) {
    postToVsCode({ type: "TODO/OPEN_FILE", payload: { filePath, line } });
  }

  async function pickFileFromWorkspace(): Promise<string | null> {
    return new Promise((resolve) => {
      pendingFilePick.current = resolve;
      postToVsCode({ type: "TODO/PICK_FILE" });
    });
  }

  function updateTodo(id: string, patch: Partial<Pick<TodoItem, "text" | "filePath" | "line" | "status" | "priority" | "labels" | "deadlineISO" | "urgencyScore">>) {
    postToVsCode({ type: "TODO/UPDATE", payload: { id, patch } });
  }

  return {
    projectName,
    todos,
    openTodos,
    error,
    refresh,
    scanWorkspace,
    syncProject,
    addManualTodo,
    updateTodo,
    pickFileFromWorkspace,
    markResolved,
    openFile,
  };
}
