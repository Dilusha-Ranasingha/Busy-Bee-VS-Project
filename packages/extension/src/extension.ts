import * as vscode from "vscode";
import { ProductDashboardViewProvider } from "./webview/ProductDashboardViewProvider";
import { TodoDashboardViewProvider } from "./webview/TodoDashboardViewProvider";

import { Logger } from "./logger/logger";

// Your “covered” modules
import { createProjectContextResolver } from "./workspace/projectContext";
import { registerWorkspaceWatchers } from "./workspace/watchers";
import { createStorageManager } from "./storage/storageManager";
import { registerCommands } from "./commands";
import { registerTodoTracker } from "./features/todo-tracker";

export async function activate(context: vscode.ExtensionContext) {
  const logger = new Logger("busy-bee-vs", "info");
  logger.info('Extension activating...');

  // 1) Project context (workspace scoped)
  const projectResolver = createProjectContextResolver(logger);

  // 2) Storage (Option A + fallback B)
  const storageManager = createStorageManager(context, logger);

  // 3) Feature init (controller)
  const todoTracker = registerTodoTracker({
    context,
    logger,
    projectResolver,
    storageManager,
  });

  // ✅ Product Dashboard webview (also supports TODO tab messaging)
  const dashboardProvider = new ProductDashboardViewProvider(context.extensionUri, {
    logger,
    todoTracker,
    projectResolver,
  });
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ProductDashboardViewProvider.viewType,
      dashboardProvider
    )
  );
  

  // ✅ Keep your existing helloWorld command
  context.subscriptions.push(
    vscode.commands.registerCommand("busy-bee-vs.helloWorld", () => {
      vscode.window.showInformationMessage("Hello World from Busy-Bee-VS!");
    })
  );

  // -------------------------------
  // ✅ TODO Tracker wiring starts
  // -------------------------------

  const todoDashboardProvider = new TodoDashboardViewProvider(context.extensionUri, {
	logger,
	todoTracker,
	projectResolver,
  });

  context.subscriptions.push(
	vscode.window.registerWebviewViewProvider(
		TodoDashboardViewProvider.viewType,
		todoDashboardProvider
	)
  );

  // 4) Commands registration (TODO commands)
  registerCommands({
    context,
    logger,
    todoTracker,
  });

  // 5) Workspace watchers (save/edit/project switch triggers)
  registerWorkspaceWatchers({
    context,
    logger,
    projectResolver,
    todoTracker,
  });

  logger.info("Extension activated ✅");
}

export function deactivate() {}
