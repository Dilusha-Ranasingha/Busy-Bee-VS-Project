import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger/logger';

type ProductDashboardDeps = {
  logger: Logger;
  todoTracker: any;
  projectResolver: { getActiveProjectContext: () => any };
};

export class ProductDashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'busyBee.productDashboard';
  
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly deps?: ProductDashboardDeps,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Listen for theme changes
    vscode.window.onDidChangeActiveColorTheme(() => {
      this._updateTheme();
    });

    // Send initial theme
    this._updateTheme();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      // Keep existing product message behavior
      if (data?.type === 'info') {
        vscode.window.showInformationMessage(data.message);
        return;
      }
      if (data?.type === 'error') {
        vscode.window.showErrorMessage(data.message);
        return;
      }

      // If TODO tracker deps are available, allow the TODO tab in this dashboard
      // to fully function (messages route to the extension controller).
      if (!this.deps) {
        return;
      }

      const { logger, todoTracker, projectResolver } = this.deps;

      try {
        switch (data?.type) {
          case 'TODO/GET':
            logger.info('[ProductDashboard] TODO/GET');
            await this._sendTodoState();
            break;

          case 'TODO/SCAN':
            logger.info('[ProductDashboard] TODO/SCAN');
            await todoTracker.scanWorkspaceNow();
            await this._sendTodoState();
            break;

          case 'TODO/SYNC_PROJECT':
            logger.info('[ProductDashboard] TODO/SYNC_PROJECT');
            if (typeof todoTracker.syncProjectNow === 'function') {
              await todoTracker.syncProjectNow();
            }
            await this._sendTodoState();
            break;

          case 'TODO/ADD_MANUAL':
            logger.info('[ProductDashboard] TODO/ADD_MANUAL');
            if (typeof todoTracker.addManualTodo === 'function') {
              await todoTracker.addManualTodo(data?.payload);
            }
            await this._sendTodoState();
            break;

          case 'TODO/UPDATE':
            logger.info('[ProductDashboard] TODO/UPDATE');
            if (data?.payload?.id && typeof todoTracker.updateTodo === 'function') {
              await todoTracker.updateTodo(data.payload);
            }
            await this._sendTodoState();
            break;

          case 'TODO/PICK_FILE': {
            logger.info('[ProductDashboard] TODO/PICK_FILE');
            const ctx = projectResolver.getActiveProjectContext();
            const workspaceRoot = ctx?.workspaceRoot;
            const picked = await vscode.window.showOpenDialog({
              canSelectMany: false,
              canSelectFiles: true,
              canSelectFolders: false,
              defaultUri: workspaceRoot,
              openLabel: 'Use file',
            });

            if (!picked || picked.length === 0) {
              this._view?.webview.postMessage({ type: 'TODO/FILE_PICKED', payload: { filePath: null } });
              break;
            }

            const rel = vscode.workspace.asRelativePath(picked[0], false);
            this._view?.webview.postMessage({ type: 'TODO/FILE_PICKED', payload: { filePath: rel } });
            break;
          }

          case 'TODO/MARK_RESOLVED':
            logger.info('[ProductDashboard] TODO/MARK_RESOLVED');
            if (data?.payload?.id) {
              await todoTracker.markResolved(data.payload.id);
            }
            await this._sendTodoState();
            break;

          case 'TODO/OPEN_FILE':
            logger.info('[ProductDashboard] TODO/OPEN_FILE');
            if (data?.payload?.filePath) {
              const uri = this._resolveWorkspaceFile(data.payload.filePath);
              if (uri) {
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc, { preview: true });

                if (typeof data.payload.line === 'number' && data.payload.line > 0) {
                  const line = Math.max(0, data.payload.line - 1);
                  const pos = new vscode.Position(line, 0);
                  editor.selection = new vscode.Selection(pos, pos);
                  editor.revealRange(new vscode.Range(pos, pos));
                }
              }
            }
            break;
        }
      } catch (e: any) {
        logger.warn(`[ProductDashboard] TODO message failed: ${e?.message ?? String(e)}`);
        this._view?.webview.postMessage({
          type: 'TODO/ERROR',
          payload: { message: e?.message ?? 'Unknown error' },
        });
      }
    });
  }

  private async _sendTodoState() {
    if (!this._view || !this.deps) return;
    const ctx = typeof this.deps.todoTracker.getProjectInfo === 'function'
      ? this.deps.todoTracker.getProjectInfo()
      : this.deps.projectResolver.getActiveProjectContext();
    const todos = this.deps.todoTracker.getTodos();

    this._view.webview.postMessage({
      type: 'TODO/STATE',
      payload: {
        projectId: ctx?.projectId ?? null,
        projectName: ctx?.projectName ?? null,
        todos,
      },
    });
  }

  private _resolveWorkspaceFile(relPath: string): vscode.Uri | null {
    const ctx = this.deps?.projectResolver.getActiveProjectContext();
    const root = ctx?.workspaceRoot;
    if (!root) return null;
    return vscode.Uri.joinPath(root, relPath);
  }

  private _updateTheme() {
    if (this._view) {
      const theme = vscode.window.activeColorTheme;
      const themeKind = theme.kind === vscode.ColorThemeKind.Light 
        ? 'light' 
        : theme.kind === vscode.ColorThemeKind.Dark 
        ? 'dark' 
        : theme.kind === vscode.ColorThemeKind.HighContrast
        ? 'high-contrast'
        : 'high-contrast-light';

      this._view.webview.postMessage({
        type: 'theme-changed',
        theme: themeKind
      });

      // Get theme colors and send them
      const colors = this._getThemeColors();
      this._view.webview.postMessage({
        type: 'update-theme-colors',
        colors
      });
    }
  }

  private _getThemeColors(): Record<string, string> {
    // Get current theme colors from VS Code
    const editor = vscode.window.activeTextEditor;
    const colors: Record<string, string> = {};

    // Map VS Code theme colors
    // Note: This is a simplified version. In production, you'd want to access
    // the actual theme colors through VS Code's theme API
    const colorMap = [
      'editorBackground',
      'editorForeground',
      'sideBarBackground',
      'sideBarForeground',
      'buttonBackground',
      'buttonForeground',
      'inputBackground',
      'inputForeground',
      'inputBorder',
      // Add more as needed
    ];

    return colors;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // For development: Point to local dev server
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Product Dashboard</title>
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
        </script>
        <script type="module">
          // Connect to development server
          import('http://localhost:5173/@vite/client');
          import('http://localhost:5173/src/main.tsx');
        </script>
      </body>
      </html>`;
    }

    // For production: Load built assets
    // TODO: Point to built dashboard files
    // This assumes the dashboard is built and placed in the extension's resources
    const dashboardPath = path.join(this._extensionUri.fsPath, 'dist', 'dashboard');
    const indexPath = path.join(dashboardPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');

      // Inject API bridge before closing head (safe)
      html = html.replace(
        '</head>',
        `<script>try{if(typeof acquireVsCodeApi==='function'){const __vscode=acquireVsCodeApi();window.__BUSY_BEE_VSCODE_API__=__vscode;window.acquireVsCodeApi=()=>__vscode;}}catch{}</script></head>`
      );
      
      // Replace asset paths with webview URIs
      html = html.replace(
        /(href|src)="([^"]+)"/g,
        (match, attr, assetPath) => {
          if (assetPath.startsWith('http') || assetPath.startsWith('//')) {
            return match;
          }
          // Vite build commonly emits absolute paths like "/assets/...".
          // In a VS Code webview, we need to resolve these relative to the built dashboard folder.
          const normalizedAssetPath = typeof assetPath === "string" && assetPath.startsWith("/")
            ? assetPath.slice(1)
            : assetPath;
          const assetUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(dashboardPath, normalizedAssetPath))
          );
          return `${attr}="${assetUri}"`;
        }
      );

      return html;
    }

    // Fallback HTML
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Product Dashboard</title>
      <style>
        body {
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
          font-family: var(--vscode-font-family);
        }
      </style>
    </head>
    <body>
      <h1>Product Dashboard</h1>
      <p>Dashboard not built yet. Please run the build command.</p>
      <p>For development: <code>npm run dev</code> in the dashboard package.</p>
    </body>
    </html>`;
  }
}
