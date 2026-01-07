import { useMemo } from "react";
import type { TodoItem } from "../types/todo.types";

export function TodoFilters(props: {
  todos: TodoItem[];
  onRefresh: () => void;
  onScan: () => void;
  onSyncProject: () => void;
}) {
  const openCount = useMemo(() => props.todos.filter(t => t.status !== "resolved").length, [props.todos]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-vscode-descriptionForeground">
        Open: <b className="text-vscode-editor-fg">{openCount}</b> / Total:{" "}
        <b className="text-vscode-editor-fg">{props.todos.length}</b>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-2 text-sm rounded-lg bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover"
          onClick={props.onSyncProject}
        >
          Sync Project
        </button>
        <button
          className="px-3 py-2 text-sm rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover"
          onClick={props.onScan}
        >
          Scan
        </button>
        <button
          className="px-3 py-2 text-sm rounded-lg bg-vscode-input-bg text-vscode-foreground border border-vscode-widget-border hover:bg-vscode-list-hover-bg"
          onClick={props.onRefresh}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
