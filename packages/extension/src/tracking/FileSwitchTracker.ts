import * as vscode from 'vscode';
import axios from 'axios';

interface WindowData {
  windowStart: Date;
  windowEnd: Date;
  activationCount: number;
}

export class FileSwitchTracker {
  private activationCount = 0;
  private windowStart: Date;
  private sessionId: string;
  private windowIntervalMinutes = 5;
  private intervalTimer?: NodeJS.Timeout;
  private lastActiveFile?: string;
  private apiBaseUrl: string;

  constructor(
    private context: vscode.ExtensionContext,
    apiBaseUrl?: string
  ) {
    this.apiBaseUrl = apiBaseUrl || 'http://localhost:4000';
    this.sessionId = this.generateSessionId();
    this.windowStart = new Date();
    
    console.log(`[FileSwitchTracker] Started tracking session: ${this.sessionId}`);
  }

  public start() {
    // Track initial file if one is open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.lastActiveFile = activeEditor.document.uri.toString();
      this.activationCount = 1; // First activation
      console.log(`[FileSwitchTracker] Initial file: ${this.lastActiveFile}`);
    }

    // Listen for active editor changes (file switches)
    // This event fires whenever the active editor changes (file switches, tab clicks, etc.)
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.onFileActivation(editor.document.uri.toString());
        }
      })
    );

    // Set up interval timer to send data every N minutes
    this.intervalTimer = setInterval(() => {
      this.flushWindow();
    }, this.windowIntervalMinutes * 60 * 1000);

    console.log(`[FileSwitchTracker] Tracking active. Interval: ${this.windowIntervalMinutes} min`);
  }

  public stop() {
    // Flush any remaining data
    this.flushWindow();
    
    // Clear interval
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }

    console.log(`[FileSwitchTracker] Stopped tracking session: ${this.sessionId}`);
  }

  private onFileActivation(fileUri: string) {
    // Count every activation, even if returning to the same file
    // A → B → A counts as 3 activations
    this.activationCount++;
    
    console.log(`[FileSwitchTracker] File activated: ${fileUri} (count: ${this.activationCount})`);
    
    this.lastActiveFile = fileUri;
  }

  private async flushWindow() {
    if (this.activationCount === 0) {
      console.log('[FileSwitchTracker] No activations in this window, skipping flush');
      return;
    }

    const windowEnd = new Date();
    const windowDurationMinutes = this.windowIntervalMinutes;
    const ratePerMin = this.activationCount / windowDurationMinutes;

    const payload = {
      sessionId: this.sessionId,
      windowStart: this.windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      activationCount: this.activationCount,
      ratePerMin: parseFloat(ratePerMin.toFixed(4)),
      workspaceTag: this.getWorkspaceTag(),
    };

    console.log('[FileSwitchTracker] Flushing window:', payload);

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/file-switch/windows`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      console.log('[FileSwitchTracker] Successfully saved window:', response.data);
      
      // Show notification (optional, can be disabled)
      vscode.window.showInformationMessage(
        `File Switch: ${this.activationCount} activations in ${this.windowIntervalMinutes} min (rate: ${ratePerMin.toFixed(2)}/min)`
      );
    } catch (error) {
      console.error('[FileSwitchTracker] Failed to save window:', error);
      vscode.window.showErrorMessage('Failed to save file switch data');
    }

    // Reset for next window
    this.activationCount = 0;
    this.windowStart = new Date();
  }

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }

  private getWorkspaceTag(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // Use workspace folder name or path hash as tag
    const workspaceName = workspaceFolders[0].name;
    return `workspace-${workspaceName}`;
  }

  // Public method to get current stats (for status bar or webview)
  public getCurrentStats() {
    return {
      sessionId: this.sessionId,
      activationCount: this.activationCount,
      windowStart: this.windowStart,
      lastActiveFile: this.lastActiveFile,
    };
  }
}
