import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { Logger } from "../logger/logger";

type TodoDashboardDeps = {
  logger: Logger;
  todoTracker: any;
  projectResolver: { getActiveProjectContext: () => any };
};

export class TodoDashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "busyBee.todoDashboard";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly deps: TodoDashboardDeps
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // theme updates
    vscode.window.onDidChangeActiveColorTheme(() => this._updateTheme());
    this._updateTheme();

    // messages from webview
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      const { logger, todoTracker } = this.deps;
      try {
        switch (msg?.type) {
          case "TODO/GET":
            logger.info("[TodoDashboard] TODO/GET");
            await this._sendTodoState();
            break;

          case "TODO/SCAN":
            logger.info("[TodoDashboard] TODO/SCAN");
            await todoTracker.scanWorkspaceNow();
            await this._sendTodoState();
            break;

          case "TODO/SYNC_PROJECT":
            logger.info("[TodoDashboard] TODO/SYNC_PROJECT");
            // Sync should not implicitly rescan; Scan has its own button.
            if (typeof todoTracker.syncProjectNow === "function") {
              await todoTracker.syncProjectNow();
            }
            await this._sendTodoState();
            break;

          case "TODO/ADD_MANUAL":
            if (typeof todoTracker.addManualTodo === "function") {
              logger.info("[TodoDashboard] TODO/ADD_MANUAL");
              // Backward compatible: payload can be {text} or a full todo form payload
              await todoTracker.addManualTodo(msg?.payload);
              await this._sendTodoState();
            }
            break;

          case "TODO/UPDATE":
            if (msg?.payload?.id && typeof todoTracker.updateTodo === "function") {
              logger.info("[TodoDashboard] TODO/UPDATE");
              await todoTracker.updateTodo(msg.payload);
              await this._sendTodoState();
            }
            break;

          case "TODO/PICK_FILE": {
            logger.info("[TodoDashboard] TODO/PICK_FILE");
            const ctx = this.deps.projectResolver.getActiveProjectContext();
            const workspaceRoot = ctx?.workspaceRoot;
            const picked = await vscode.window.showOpenDialog({
              canSelectMany: false,
              canSelectFiles: true,
              canSelectFolders: false,
              defaultUri: workspaceRoot,
              openLabel: "Use file",
            });

            if (!picked || picked.length === 0) {
              this._view?.webview.postMessage({ type: "TODO/FILE_PICKED", payload: { filePath: null } });
              break;
            }

            const rel = vscode.workspace.asRelativePath(picked[0], false);
            this._view?.webview.postMessage({ type: "TODO/FILE_PICKED", payload: { filePath: rel } });
            break;
          }

          case "TODO/MARK_RESOLVED":
            if (msg?.payload?.id) {
              await todoTracker.markResolved(msg.payload.id);
              await this._sendTodoState();
            }
            break;

          case "TODO/OPEN_FILE":
            if (msg?.payload?.filePath) {
              const uri = this._resolveWorkspaceFile(msg.payload.filePath);
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
        logger.warn(`[TodoDashboard] message failed: ${e?.message ?? String(e)}`);
        this._view?.webview.postMessage({
          type: "TODO/ERROR",
          payload: { message: e?.message ?? "Unknown error" },
        });
      }
    });

    // initial navigation + state
    setTimeout(() => {
      this._view?.webview.postMessage({ type: "busyBee:navigate", tab: "todo" });
      void this._sendTodoState();
    }, 200);
  }

  public refresh() {
    void this._sendTodoState();
  }

  private async _sendTodoState() {
    const ctx = typeof this.deps.todoTracker.getProjectInfo === "function"
      ? this.deps.todoTracker.getProjectInfo()
      : this.deps.projectResolver.getActiveProjectContext();
    const todos = this.deps.todoTracker.getTodos();

    this._view?.webview.postMessage({
      type: "TODO/STATE",
      payload: {
        projectId: ctx?.projectId ?? null,
        projectName: ctx?.projectName ?? null,
        todos,
      },
    });
  }

  private _resolveWorkspaceFile(relPath: string): vscode.Uri | null {
    const ctx = this.deps.projectResolver.getActiveProjectContext();
    const root = ctx?.workspaceRoot;
    if (!root) {
      return null;
    }
    return vscode.Uri.joinPath(root, relPath);
  }

  private _updateTheme() {
    if (!this._view) {
      return;
    }

    const theme = vscode.window.activeColorTheme;
    const themeKind =
      theme.kind === vscode.ColorThemeKind.Light
        ? "light"
        : theme.kind === vscode.ColorThemeKind.Dark
        ? "dark"
        : theme.kind === vscode.ColorThemeKind.HighContrast
        ? "high-contrast"
        : "high-contrast-light";

    this._view.webview.postMessage({ type: "theme-changed", theme: themeKind });

    // You currently return empty colors in ProductDashboardViewProvider.
    // Keeping the same behavior here for consistency:
    this._view.webview.postMessage({ type: "update-theme-colors", colors: {} });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const isDevelopment = process.env.NODE_ENV === "development";

    // DEV: load from Vite dev server
    if (isDevelopment) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script>
    // Bridge: create a stable VS Code API object early and expose it for the bundle.
    try {
      if (typeof acquireVsCodeApi === 'function') {
        const __vscode = acquireVsCodeApi();
        window.__BUSY_BEE_VSCODE_API__ = __vscode;
        window.acquireVsCodeApi = () => __vscode;
      }
    } catch {}
    window.__BUSY_BEE_DEFAULT_TAB__ = "todo";
  </script>
  <script type="module">
    import('http://localhost:5173/@vite/client');
    import('http://localhost:5173/src/main.tsx');
  </script>
</body>
</html>`;
    }

    // PROD: load built dashboard from extension/dist/dashboard
    const dashboardPath = path.join(this._extensionUri.fsPath, "dist", "dashboard");
    const indexPath = path.join(dashboardPath, "index.html");

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, "utf-8");

      // inject default tab + API bridge before closing head (safe)
      html = html.replace(
        "</head>",
        `<script>try{if(typeof acquireVsCodeApi==='function'){const __vscode=acquireVsCodeApi();window.__BUSY_BEE_VSCODE_API__=__vscode;window.acquireVsCodeApi=()=>__vscode;}}catch{}</script><script>window.__BUSY_BEE_DEFAULT_TAB__="todo";</script></head>`
      );

      // Replace asset paths with webview URIs
      html = html.replace(/(href|src)="([^"]+)"/g, (match, attr, assetPath) => {
        if (assetPath.startsWith("http") || assetPath.startsWith("//")) {
          return match;
        }
        // Vite build commonly emits absolute paths like "/assets/...".
        // In a VS Code webview, we need to resolve these relative to the built dashboard folder.
        const normalizedAssetPath = typeof assetPath === "string" && assetPath.startsWith("/")
          ? assetPath.slice(1)
          : assetPath;
        const assetUri = webview.asWebviewUri(vscode.Uri.file(path.join(dashboardPath, normalizedAssetPath)));
        return `${attr}="${assetUri}"`;
      });

      return html;
    }

    // fallback
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo Dashboard</title>
</head>
<body style="padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background);font-family:var(--vscode-font-family);">
  <h2>TODO Dashboard</h2>
  <p>Dashboard not built yet.</p>
  <p>Run from repo root: <code>node scripts/build-dashboard.js</code></p>
</body>
</html>`;
  }
}
