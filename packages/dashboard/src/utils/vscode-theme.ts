/**
 * VS Code Theme Integration Utility
 * Detects VS Code API and listens for theme changes
 */

interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

class VsCodeTheme {
  private vscode: VsCodeApi | null = null;
  private isVsCodeContext = false;

  constructor() {
    this.init();
  }

  private init() {
    // Check if running in VS Code webview
    if (typeof window.acquireVsCodeApi === 'function') {
      try {
        this.vscode = window.acquireVsCodeApi();
        this.isVsCodeContext = true;
        this.setupThemeListener();
        console.log('✅ VS Code webview context detected');
      } catch (error) {
        console.warn('Failed to acquire VS Code API:', error);
      }
    } else {
      console.log('📱 Running in standalone browser mode');
    }
  }

  private setupThemeListener() {
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      switch (message.type) {
        case 'theme-changed':
          this.applyTheme(message.theme);
          break;
        case 'update-theme-colors':
          this.updateThemeColors(message.colors);
          break;
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark' | 'high-contrast' | 'high-contrast-light') {
    console.log('🎨 Applying VS Code theme:', theme);
    document.body.setAttribute('data-vscode-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--vscode-editor-background')
        .trim();
      metaThemeColor.setAttribute('content', bgColor);
    }
  }

  private updateThemeColors(colors: Record<string, string>) {
    console.log('🎨 Updating theme colors:', Object.keys(colors).length, 'variables');
    
    // Update CSS custom properties
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      // Convert camelCase to kebab-case (e.g., editorBackground -> editor-background)
      const cssVar = `--vscode-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
  }

  public isInVsCode(): boolean {
    return this.isVsCodeContext;
  }

  public postMessage(message: any) {
    if (this.vscode) {
      this.vscode.postMessage(message);
    } else {
      console.warn('Cannot post message: Not in VS Code context');
    }
  }

  public getState(): any {
    return this.vscode?.getState();
  }

  public setState(state: any) {
    this.vscode?.setState(state);
  }
}

// Create singleton instance
export const vsCodeTheme = new VsCodeTheme();

// Export helper functions
export const isVsCodeWebview = () => vsCodeTheme.isInVsCode();
export const postMessageToVsCode = (message: any) => vsCodeTheme.postMessage(message);
