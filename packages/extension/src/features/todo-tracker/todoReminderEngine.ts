import * as vscode from "vscode";
import { Logger } from "../../logger/logger";
import { REMINDER_COOLDOWN_MS } from "./todo.constants";
import { TodoTelemetry } from "./todo.telemetry";

export class TodoReminderEngine {
  private lastShown = new Map<string, number>(); // todoId -> timestamp

  constructor(
    private readonly logger: Logger,
    private readonly telemetry: TodoTelemetry
  ) {}

  shouldShow(todo: any) {
    if (todo.status === "resolved") return false;
    const last = this.lastShown.get(todo.id) ?? 0;
    return Date.now() - last > REMINDER_COOLDOWN_MS;
  }

  async maybeRemindForActiveFile(todos: any[], activeFilePath?: string) {
    if (!activeFilePath) return;

    // Choose urgent/high todos in the active file first
    const relevant = todos
      .filter(t => t.filePath === activeFilePath && t.status !== "resolved")
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));

    for (const todo of relevant) {
      if (!this.shouldShow(todo)) continue;

      this.lastShown.set(todo.id, Date.now());

      const msg = formatReminder(todo);
      this.logger.info(`[reminder] ${msg}`);
      this.telemetry.emit({ type: "reminder_shown", todoId: todo.id, filePath: todo.filePath });

      // Non-intrusive: info message with actions
      const action = await vscode.window.showInformationMessage(
        msg,
        "Mark Resolved",
        "Snooze 30m"
      );

      if (action === "Mark Resolved") {
        // caller/controller should handle state change; we just signal via command
        await vscode.commands.executeCommand("busy-bee-vs.todo.markResolved");
      } else if (action === "Snooze 30m") {
        this.lastShown.set(todo.id, Date.now() + 30 * 60 * 1000);
      }
      break; // show only one at a time
    }
  }
}

function priorityRank(p: any) {
  switch (p) {
    case "urgent": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

function formatReminder(todo: any) {
  const pri = todo.priority ? todo.priority.toUpperCase() : "TODO";
  return `[${pri}] ${todo.text} (${todo.filePath}:${todo.line})`;
}
