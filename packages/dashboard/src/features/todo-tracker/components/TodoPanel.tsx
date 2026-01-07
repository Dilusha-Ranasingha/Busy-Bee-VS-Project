import { TodoItemCard } from "./TodoItemCard";
import { TodoFilters } from "./TodoFilters";
import { useTodoTracker } from "../hooks/useTodoTracker";
import { useState } from "react";
import { Button, Input, Textarea } from "../../../components/ui";

export function TodoPanel() {
  const { projectName, openTodos, todos, error, refresh, scanWorkspace, syncProject, addManualTodo, updateTodo, pickFileFromWorkspace, markResolved, openFile } = useTodoTracker();
  type TodoStatus = "open" | "in_progress" | "resolved";
  type TodoPriority = "" | "low" | "medium" | "high" | "urgent";
  const [showManualForm, setShowManualForm] = useState(false);
  const [form, setForm] = useState({
    text: "",
    filePath: "__manual__",
    line: "0",
    status: "open" as TodoStatus,
    priority: "" as TodoPriority,
    labels: "",
    deadlineLocal: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-vscode-panel-border bg-vscode-widget-bg shadow-vscode p-4">
        <div className="text-lg font-semibold text-vscode-editor-fg">TODO Tracker</div>
        <div className="text-sm text-vscode-descriptionForeground mt-1">
          Project: <b className="text-vscode-editor-fg">{projectName ?? "No workspace"}</b>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-vscode-editor-fg">
          <b>Error:</b> {error}
        </div>
      ) : null}

      <TodoFilters todos={todos} onRefresh={refresh} onScan={scanWorkspace} onSyncProject={syncProject} />

      <div className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-vscode-editor-fg">Manual TODO</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setShowManualForm((v) => !v);
            }}
            aria-label="Add a new manual todo"
          >
            +
          </Button>
        </div>

        {showManualForm ? (
          <form
            className="mt-3 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);

              const text = form.text.trim();
              const filePath = form.filePath.trim();
              const line = Number(form.line);

              if (!text) {
                setFormError("Text is required");
                return;
              }
              if (!filePath) {
                setFormError("File path is required");
                return;
              }
              if (!Number.isFinite(line) || line < 0) {
                setFormError("Line must be a non-negative number");
                return;
              }

              const labels = form.labels
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

              // Auto-calculate urgency score (0..1) based on priority/text.
              // Backend enrichment may refine this further when available.
              const lower = text.toLowerCase();
              const hasUrgentKeyword = ["urgent", "asap", "immediately", "now", "critical", "blocker"].some(k => lower.includes(k));
              const priorityScore =
                form.priority === "urgent" ? 0.9 :
                form.priority === "high" ? 0.7 :
                form.priority === "medium" ? 0.4 :
                form.priority === "low" ? 0.2 :
                undefined;
              const urgencyScore = priorityScore ?? (hasUrgentKeyword ? 0.85 : 0.5);

              // Convert datetime-local to ISO string (or null)
              const deadlineISO = form.deadlineLocal.trim()
                ? new Date(form.deadlineLocal).toISOString()
                : null;

              addManualTodo({
                text,
                filePath,
                line,
                status: form.status,
                priority: form.priority || undefined,
                labels: labels.length ? labels : undefined,
                deadlineISO,
                urgencyScore,
              });

              setForm({
                text: "",
                filePath: "__manual__",
                line: "0",
                status: "open",
                priority: "",
                labels: "",
                deadlineLocal: "",
              });
              setShowManualForm(false);
            }}
          >
            <Textarea
              label="Text (required)"
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              placeholder="Describe the TODO"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="w-full">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="File path (required)"
                      value={form.filePath}
                      onChange={(e) => setForm((p) => ({ ...p, filePath: e.target.value }))}
                      placeholder="Type, or click Browse"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const picked = await pickFileFromWorkspace();
                      if (picked) {
                        setForm((p) => ({ ...p, filePath: picked }));
                      }
                    }}
                  >
                    Browse
                  </Button>
                </div>
              </div>
              <Input
                label="Line (required)"
                type="number"
                min="0"
                value={form.line}
                onChange={(e) => setForm((p) => ({ ...p, line: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="w-full">
                <label className="block text-sm font-medium text-vscode-foreground mb-1">Status</label>
                <select
                  className="w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TodoStatus }))}
                >
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-vscode-foreground mb-1">Priority</label>
                <select
                  className="w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TodoPriority }))}
                >
                  <option value="">(none)</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>
            </div>

            <Input
              label="Labels (comma-separated)"
              value={form.labels}
              onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))}
              placeholder="e.g. backend, refactor"
            />

            <Input
              label="Deadline (optional)"
              type="datetime-local"
              value={form.deadlineLocal}
              onChange={(e) => setForm((p) => ({ ...p, deadlineLocal: e.target.value }))}
            />

            {formError ? (
              <div className="text-sm text-vscode-error">{formError}</div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setShowManualForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      {openTodos.length === 0 ? (
        <div className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg p-6 text-sm text-vscode-descriptionForeground">
          No open TODOs. Add comments like <code>// TODO: ...</code> and save.
        </div>
      ) : (
        <div className="grid gap-3">
          {openTodos.map(todo => (
            <TodoItemCard
              key={todo.id}
              todo={todo}
              onOpen={openFile}
              onResolve={markResolved}
              onUpdate={updateTodo}
              onPickFile={pickFileFromWorkspace}
            />
          ))}
        </div>
      )}
    </div>
  );
}
