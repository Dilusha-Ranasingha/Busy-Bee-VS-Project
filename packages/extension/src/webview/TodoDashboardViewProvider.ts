import * as vscode from "vscode";
import { Logger } from "../logger/logger";

type TodoDashboardDeps = {
  logger: Logger;
  todoTracker: any; // your TodoTrackerController
  projectResolver: { getActiveProjectContext: () => any };
};

export class TodoDashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "busyBee.todoDashboard";

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly deps: TodoDashboardDeps
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "dist"),
        vscode.Uri.joinPath(this.extensionUri, "resources"),
      ],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      const { logger, todoTracker } = this.deps;

      try {
        switch (msg?.type) {
          case "TODO/GET":
            await this.sendTodoState();
            break;

          case "TODO/SCAN":
            await todoTracker.scanWorkspaceNow();
            await this.sendTodoState();
            break;

          case "TODO/MARK_RESOLVED":
            if (msg?.payload?.id) {
              await todoTracker.markResolved(msg.payload.id);
              await this.sendTodoState();
            }
            break;

          case "TODO/OPEN_FILE":
            if (msg?.payload?.filePath) {
              const uri = this.resolveWorkspaceFile(msg.payload.filePath);
              if (uri) {
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc, { preview: true });
                if (typeof msg.payload.line === "number" && msg.payload.line > 0) {
                  const line = Math.max(0, msg.payload.line - 1);
                  const pos = new vscode.Position(line, 0);
                  editor.selection = new vscode.Selection(pos, pos);
                  editor.revealRange(new vscode.Range(pos, pos));
                }
              }
            }
            break;
        }
      } catch (e: any) {
        logger.warn(`[TodoDashboard] message handling failed: ${e?.message ?? String(e)}`);
        this.postMessage({
          type: "TODO/ERROR",
          payload: { message: e?.message ?? "Unknown error" },
        });
      }
    });

    // When view becomes visible, refresh state
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) void this.sendTodoState();
    });

    // Initial state
    void this.sendTodoState();
  }

  /** Allows controller/watchers to push updates to UI later if you call provider.refresh() */
  public refresh() {
    void this.sendTodoState();
  }

  private async sendTodoState() {
    const ctx = this.deps.projectResolver.getActiveProjectContext();
    const todos = this.deps.todoTracker.getTodos();

    this.postMessage({
      type: "TODO/STATE",
      payload: {
        projectId: ctx?.projectId ?? null,
        projectName: ctx?.projectName ?? null,
        todos,
      },
    });
  }

  private postMessage(message: any) {
    this.view?.webview.postMessage(message);
  }

  private resolveWorkspaceFile(relPath: string): vscode.Uri | null {
    const ctx = this.deps.projectResolver.getActiveProjectContext();
    const root = ctx?.workspaceRoot;
    if (!root) return null;
    return vscode.Uri.joinPath(root, relPath);
  }

  private getHtml(webview: vscode.Webview) {
    const nonce = getNonce();

    // IMPORTANT:
    // This expects your dashboard build to output:
    // packages/extension/dist/todo-dashboard/index.html
    // (or adjust the paths below)
    const indexUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "todo-dashboard", "index.html")
    );

    // We load the built HTML as an iframe-like approach is not allowed,
    // so simplest is: fetch built index and inline it — BUT VS Code webviews
    // cannot fetch local files directly.
    // Therefore we generate a minimal HTML shell that loads a JS bundle.
    //
    // Recommended output:
    // dist/todo-dashboard/assets/index.js and index.css
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "todo-dashboard", "assets", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "todo-dashboard", "assets", "index.css")
    );

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 img-src ${webview.cspSource} https: data:;
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';
                 font-src ${webview.cspSource} https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Busy Bee - TODO Tracker</title>
  <link href="${styleUri}" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    // VS Code API for messaging
    window.vscode = acquireVsCodeApi();
  </script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  return nonce;
}
