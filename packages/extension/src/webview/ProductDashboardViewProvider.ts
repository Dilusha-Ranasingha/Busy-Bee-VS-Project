import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ProductDashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'busyBee.productDashboard';
  
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
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
    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'info':
          vscode.window.showInformationMessage(data.message);
          break;
        case 'error':
          vscode.window.showErrorMessage(data.message);
          break;
      }
    });
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
      
      // Replace asset paths with webview URIs
      html = html.replace(
        /(href|src)="([^"]+)"/g,
        (match, attr, assetPath) => {
          if (assetPath.startsWith('http') || assetPath.startsWith('//')) {
            return match;
          }
          const assetUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(dashboardPath, assetPath))
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
