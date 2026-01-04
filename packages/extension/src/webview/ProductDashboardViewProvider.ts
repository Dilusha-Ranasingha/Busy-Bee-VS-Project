import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AuthManager } from '../auth/AuthManager';

export class ProductDashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'busyBee.productDashboard';
  
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _authManager: AuthManager,
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

    // Send initial auth state
    this._updateAuthState();

    // Listen for auth changes
    this._authManager.onAuthChange(() => {
      this._updateAuthState();
    });

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async data => {
      console.log('[WebviewProvider] Received message:', data);
      
      switch (data.type) {
        case 'signIn':
          console.log('[WebviewProvider] Processing sign-in request');
          await this._handleSignIn();
          break;
        case 'signOut':
          console.log('[WebviewProvider] Processing sign-out request');
          await this._handleSignOut();
          break;
        case 'info':
          vscode.window.showInformationMessage(data.message);
          break;
        case 'error':
          vscode.window.showErrorMessage(data.message);
          break;
        default:
          console.log('[WebviewProvider] Unknown message type:', data.type);
      }
    });
  }

  private async _handleSignIn() {
    try {
      console.log('[WebviewProvider] Starting sign-in process');
      const user = await this._authManager.signIn();
      console.log('[WebviewProvider] Sign-in result:', user ? user.username : 'null');
      if (user) {
        vscode.window.showInformationMessage(`Welcome ${user.username}! File tracking started.`);
      }
    } catch (error) {
      console.error('[WebviewProvider] Sign in error:', error);
      vscode.window.showErrorMessage(`Sign in failed: ${error}`);
    }
  }

  private async _handleSignOut() {
    await this._authManager.signOut();
  }

  private _updateAuthState() {
    if (this._view) {
      const user = this._authManager.getUser();
      
      // Refresh the entire webview when auth state changes
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      
      // Also send message for live updates
      this._view.webview.postMessage({
        type: 'auth-state-changed',
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
        } : null,
      });
    }
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
    const user = this._authManager.getUser();
    
    // If user is signed in, show the dashboard
    if (user) {
      return this._getDashboardHtml(webview, user);
    }
    
    // If not signed in, show auth UI
    return this._getAuthHtml();
  }

  private _getDashboardHtml(webview: vscode.Webview, user: any) {
    // For development: Point to local dev server
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Busy Bee Dashboard</title>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          iframe { width: 100%; height: 100vh; border: none; }
        </style>
      </head>
      <body>
        <iframe src="http://localhost:5173" allow="clipboard-read; clipboard-write"></iframe>
        <script>
          const vscode = acquireVsCodeApi();
          
          // Send auth info to dashboard via iframe
          window.addEventListener('load', () => {
            const iframe = document.querySelector('iframe');
            iframe.contentWindow.postMessage({
              type: 'extension-auth',
              user: ${JSON.stringify(user)}
            }, 'http://localhost:5173');
          });
        </script>
      </body>
      </html>`;
    }

    // For production: Load built dashboard
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

      // Inject user data
      html = html.replace('</head>', `
        <script>
          window.__EXTENSION_USER__ = ${JSON.stringify(user)};
        </script>
      </head>`);

      return html;
    }

    // Fallback: Show auth UI if dashboard not built
    return this._getAuthHtml();
  }

  private _getAuthHtml() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Busy Bee</title>
      <style>
        body {
          padding: 0;
          margin: 0;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
        }
        .container {
          padding: 20px;
        }
        .auth-section {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background: var(--vscode-editor-background);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid var(--vscode-button-background);
        }
        .user-details h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
        }
        .user-details p {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }
        button {
          width: 100%;
          padding: 8px 16px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--vscode-font-family);
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        button.secondary {
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }
        .sign-in-prompt {
          text-align: center;
          padding: 24px 16px;
        }
        .sign-in-prompt h2 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .sign-in-prompt p {
          margin: 0 0 16px 0;
          font-size: 12px;
          opacity: 0.8;
        }
        .github-icon {
          width: 20px;
          height: 20px;
        }
        .info-section {
          margin-top: 16px;
          padding: 12px;
          background: var(--vscode-textBlockQuote-background);
          border-left: 3px solid var(--vscode-textLink-foreground);
          border-radius: 4px;
        }
        .info-section p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
        }
        #signed-in-view {
          display: none;
        }
        #signed-out-view {
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Signed In View -->
        <div id="signed-in-view">
          <div class="auth-section">
            <div class="user-info">
              <img id="user-avatar" class="avatar" src="" alt="User avatar">
              <div class="user-details">
                <h3 id="user-name">Loading...</h3>
                <p id="user-username">@username</p>
              </div>
            </div>
            <button class="secondary" onclick="signOut()">
              Sign Out
            </button>
          </div>
          
          <div class="info-section">
            <p>✅ <strong>File tracking active!</strong></p>
            <p>Your file switching activity is being tracked and will be visible in the dashboard.</p>
          </div>
        </div>

        <!-- Signed Out View -->
        <div id="signed-out-view">
          <div class="sign-in-prompt">
            <h2>🐝 Busy Bee</h2>
            <p>Sign in with GitHub to start tracking your file switching activity</p>
            <button onclick="signIn()">
              <svg class="github-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        
        let currentUser = null;

        function signIn() {
          console.log('[Webview] Sign in button clicked');
          vscode.postMessage({ type: 'signIn' });
        }

        function signOut() {
          console.log('[Webview] Sign out button clicked');
          vscode.postMessage({ type: 'signOut' });
        }

        function updateUI(user) {
          currentUser = user;
          const signedInView = document.getElementById('signed-in-view');
          const signedOutView = document.getElementById('signed-out-view');

          if (user) {
            // Show signed in view
            signedInView.style.display = 'block';
            signedOutView.style.display = 'none';
            
            // Update user info
            document.getElementById('user-avatar').src = user.avatarUrl;
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-username').textContent = '@' + user.username;
          } else {
            // Show signed out view
            signedInView.style.display = 'none';
            signedOutView.style.display = 'block';
          }
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.type) {
            case 'auth-state-changed':
              console.log('[Webview] Auth state changed:', message.user);
              updateUI(message.user);
              break;
          }
        });

        // Initial state
        updateUI(null);
      </script>
    </body>
    </html>`;
  }
}
