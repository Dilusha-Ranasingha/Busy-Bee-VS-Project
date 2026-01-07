import * as vscode from "vscode";
import { Logger } from "../logger/logger";

interface TodoQuickPickItem extends vscode.QuickPickItem {
  id: string;
}

export function registerTodoTrackerCommands(deps: {
  context: vscode.ExtensionContext;
  logger: Logger;
  todoTracker: any;
}) {
  const { context, logger, todoTracker } = deps;

  async function scanWorkspace() {
    await todoTracker.scanWorkspaceNow();
    vscode.window.showInformationMessage("TODO Tracker: workspace scan completed");
  }

  async function showTodos() {
    const todos = todoTracker.getTodos();
    const top = todos.slice(0, 20).map((t: any) => `${t.status} | ${t.priority ?? "-"} | ${t.text}`);
    vscode.window.showInformationMessage(`Todos (${todos.length}):\n${top.join("\n")}`);
  }

  async function markResolved() {
    const todos = todoTracker.getTodos().filter((t: any) => t.status !== "resolved");

    const items: TodoQuickPickItem[] = todos.map((t: any) => ({
      label: t.text,
      description: `${t.filePath}:${t.line}`,
      id: t.id,
    }));

    const pick = await vscode.window.showQuickPick<TodoQuickPickItem>(items, {
      placeHolder: "Select a TODO to mark resolved",
    });
    if (!pick) return;

    await todoTracker.markResolved(pick.id);
    vscode.window.showInformationMessage("TODO marked resolved");
  }

  context.subscriptions.push(
    // Contributed IDs (package.json)
    vscode.commands.registerCommand("busy-bee-vs.todo.scanWorkspace", scanWorkspace),
    vscode.commands.registerCommand("busy-bee-vs.todo.showTodos", showTodos),
    vscode.commands.registerCommand("busy-bee-vs.todo.markResolved", markResolved),

    // Backward-compatible aliases (if anything still calls old IDs)
    vscode.commands.registerCommand("busyBee.todoTracker.scanWorkspace", scanWorkspace),
    vscode.commands.registerCommand("busyBee.todoTracker.showTodos", showTodos),
    vscode.commands.registerCommand("busyBee.todoTracker.markResolved", markResolved)
  );

  logger.info("TODO tracker commands registered ✅");
}
