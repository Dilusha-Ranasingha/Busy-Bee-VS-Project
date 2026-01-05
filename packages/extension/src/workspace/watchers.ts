import * as vscode from "vscode";
import { Logger } from "../logger/logger";

export function registerWorkspaceWatchers(deps: {
  context: vscode.ExtensionContext;
  logger: Logger;
  projectResolver: any;
  todoTracker: any;
}) {
  const { context, logger, todoTracker } = deps;

  // active editor change -> project switching
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      try {
        await todoTracker.onActiveEditorChanged(editor);
      } catch (e) {
        logger.warn(`onActiveEditorChanged failed: ${String(e)}`);
      }
    })
  );

  // on save -> incremental scan
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      try {
        await todoTracker.onDocumentSaved(doc);
      } catch (e) {
        logger.warn(`onDocumentSaved failed: ${String(e)}`);
      }
    })
  );

  // on workspace folders changed -> resync
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      try {
        await todoTracker.init();
      } catch (e) {
        logger.warn(`workspace change init failed: ${String(e)}`);
      }
    })
  );

  // initial init
  void todoTracker.init();
}
