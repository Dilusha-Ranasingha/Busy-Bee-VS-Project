import type { TodoItem } from "../types/todo.types";
import { useMemo, useState } from "react";
import { Button, Input, Textarea } from "../../../components/ui";

export function TodoItemCard(props: {
  todo: TodoItem;
  onOpen: (filePath: string, line?: number) => void;
  onResolve: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<TodoItem, "text" | "filePath" | "line" | "priority" | "deadlineISO">>) => void;
  onPickFile: () => Promise<string | null>;
}) {
  const { todo, onOpen, onResolve, onUpdate, onPickFile } = props;
  const isManual = todo.filePath === "__manual__";
  const [isEditing, setIsEditing] = useState(false);

  type TodoPriority = "" | "low" | "medium" | "high" | "urgent";

  const [edit, setEdit] = useState({
    text: todo.text,
    filePath: todo.filePath,
    line: String(todo.line ?? 0),
    priority: (todo.priority ?? "") as TodoPriority,
    deadlineLocal: "",
  });

  const hasDeadline = useMemo(() => !!todo.deadlineISO, [todo.deadlineISO]);

  // Populate datetime-local from ISO on first open.
  function openEditor() {
    const dl = todo.deadlineISO ? new Date(todo.deadlineISO).toISOString().slice(0, 16) : "";
    setEdit({
      text: todo.text,
      filePath: todo.filePath,
      line: String(todo.line ?? 0),
      priority: (todo.priority ?? "") as TodoPriority,
      deadlineLocal: dl,
    });
    setIsEditing(true);
  }

  return (
    <div className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {todo.priority ? (
              <span
                className={
                  "text-[11px] px-2 py-1 rounded-full border border-vscode-widget-border bg-vscode-input-bg " +
                  (todo.priority === "urgent"
                    ? "text-vscode-error font-semibold"
                    : todo.priority === "high"
                    ? "text-vscode-editor-fg font-semibold"
                    : "text-vscode-foreground")
                }
              >
                {todo.priority.toUpperCase()}
              </span>
            ) : null}
            <div className="font-semibold text-vscode-editor-fg break-words">
              {todo.text}
            </div>
          </div>
          <div className="mt-1 text-sm text-vscode-descriptionForeground truncate">
            {isManual ? "Manual" : `${todo.filePath}:${todo.line}`}
          </div>

          {todo.deadlineISO ? (
            <div className="mt-1 text-xs text-vscode-descriptionForeground">
              Deadline: <span className="text-vscode-editor-fg">{todo.deadlineISO}</span>
            </div>
          ) : null}

          {todo.labels?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {todo.labels.map(l => (
                <span
                  key={l}
                  className="text-xs px-2 py-1 rounded-full border border-vscode-widget-border bg-vscode-input-bg text-vscode-foreground"
                >
                  {l}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {!isManual ? (
            <button
              className="px-3 py-2 text-sm rounded-lg bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover"
              onClick={() => onOpen(todo.filePath, todo.line)}
            >
              Open
            </button>
          ) : null}

          <button
            className="px-3 py-2 text-sm rounded-lg bg-vscode-input-bg text-vscode-foreground border border-vscode-widget-border hover:bg-vscode-list-hover-bg"
            onClick={() => (isEditing ? setIsEditing(false) : openEditor())}
          >
            {isEditing ? "Close" : "Edit"}
          </button>

          <button
            className="px-3 py-2 text-sm rounded-lg bg-vscode-input-bg text-vscode-foreground border border-vscode-widget-border hover:bg-vscode-list-hover-bg"
            onClick={() => onResolve(todo.id)}
          >
            Resolve
          </button>
        </div>
      </div>

      {isEditing ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const text = edit.text.trim();
            const filePath = edit.filePath.trim();
            const line = Number(edit.line);

            if (!text || !filePath || !Number.isFinite(line) || line < 0) {
              return;
            }

            const deadlineISO = edit.deadlineLocal.trim() ? new Date(edit.deadlineLocal).toISOString() : null;

            onUpdate(todo.id, {
              text,
              filePath,
              line,
              priority: edit.priority || undefined,
              deadlineISO,
            });

            setIsEditing(false);
          }}
        >
          <Textarea
            label="Text"
            value={edit.text}
            onChange={(e) => setEdit((p) => ({ ...p, text: e.target.value }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="File path"
                    value={edit.filePath}
                    onChange={(e) => setEdit((p) => ({ ...p, filePath: e.target.value }))}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const picked = await onPickFile();
                    if (picked) {
                      setEdit((p) => ({ ...p, filePath: picked }));
                    }
                  }}
                >
                  Browse
                </Button>
              </div>
            </div>

            <Input
              label="Line"
              type="number"
              min="0"
              value={edit.line}
              onChange={(e) => setEdit((p) => ({ ...p, line: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full">
              <label className="block text-sm font-medium text-vscode-foreground mb-1">Priority</label>
              <select
                className="w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus px-3 py-2 text-sm"
                value={edit.priority}
                onChange={(e) => setEdit((p) => ({ ...p, priority: e.target.value as TodoPriority }))}
              >
                <option value="">(none)</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </div>

            <Input
              label={hasDeadline ? "Deadline" : "Deadline (optional)"}
              type="datetime-local"
              value={edit.deadlineLocal}
              onChange={(e) => setEdit((p) => ({ ...p, deadlineLocal: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
