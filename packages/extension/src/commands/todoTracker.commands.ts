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

  context.subscriptions.push(
    vscode.commands.registerCommand("busyBee.todoTracker.scanWorkspace", async () => {
      await todoTracker.scanWorkspaceNow();
      vscode.window.showInformationMessage("TODO Tracker: workspace scan completed");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("busyBee.todoTracker.showTodos", async () => {
      const todos = todoTracker.getTodos();
      const top = todos.slice(0, 20).map((t: any) => `${t.status} | ${t.priority ?? "-"} | ${t.text}`);
      vscode.window.showInformationMessage(`Todos (${todos.length}):\n${top.join("\n")}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("busyBee.todoTracker.markResolved", async () => {
        const todos = todoTracker.getTodos().filter((t: any) => t.status !== "resolved");

        const items: TodoQuickPickItem[] = todos.map((t: any) => ({
        label: t.text,
        description: `${t.filePath}:${t.line}`,
        id: t.id
        }));

        const pick = await vscode.window.showQuickPick<TodoQuickPickItem>(items, {
        placeHolder: "Select a TODO to mark resolved"
        });
        if (!pick) return;

        await todoTracker.markResolved(pick.id);
        vscode.window.showInformationMessage("TODO marked resolved");
    })
  );

  logger.info("TODO tracker commands registered ✅");
}
