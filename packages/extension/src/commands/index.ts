import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { registerTodoTrackerCommands } from "./todoTracker.commands";

export function registerCommands(deps: {
  context: vscode.ExtensionContext;
  logger: Logger;
  todoTracker: any;
}) {
  registerTodoTrackerCommands(deps);
}
