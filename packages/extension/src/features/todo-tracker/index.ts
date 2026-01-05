import * as vscode from "vscode";
import { Logger } from "../../logger/logger";
import { createTodoTrackerController, TodoTrackerController } from "./todoTracker.controller";

export function registerTodoTracker(deps: {
  context: vscode.ExtensionContext;
  logger: Logger;
  projectResolver: {
    getActiveProjectContext(): any;
  };
  storageManager: {
    load(projectId: string, workspaceRoot: vscode.Uri): Promise<any>;
    save(projectId: string, workspaceRoot: vscode.Uri, data: any): Promise<any>;
  };
}): TodoTrackerController {
  const controller = createTodoTrackerController(deps);
  return controller;
}
