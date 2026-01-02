import * as vscode from 'vscode';
import axios from 'axios';
import { AuthManager } from '../auth/AuthManager';

interface WindowData {
  windowStart: Date;
  windowEnd: Date;
  activationCount: number;
}

export class FileSwitchTracker {
  private activationCount = 0;
  private windowStart: Date;
  private sessionId: string;
  private idleTimeoutMinutes = 10; // Session ends after 10 minutes of inactivity
  private idleTimer?: NodeJS.Timeout;
  private lastActiveFile?: string;
  private apiBaseUrl: string;
  private isSessionActive = false; // Track if session is currently active
  private authManager: AuthManager;

  constructor(
    private context: vscode.ExtensionContext,
    authManager: AuthManager,
    apiBaseUrl?: string
  ) {
    this.authManager = authManager;
    this.apiBaseUrl = apiBaseUrl || 'http://localhost:4000';
    this.sessionId = this.generateSessionId();
    this.windowStart = new Date();
    
    console.log(`[FileSwitchTracker] Initialized tracker`);
  }

  public start() {
    // Track initial file if one is open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.lastActiveFile = activeEditor.document.uri.toString();
      this.activationCount = 1; // First activation
      this.isSessionActive = true;
      this.startIdleTimer();
      console.log(`[FileSwitchTracker] Session started with initial file: ${this.lastActiveFile}`);
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

    console.log(`[FileSwitchTracker] Tracker ready. Sessions start on first file switch (10 min idle timeout)`);
  }

  public stop() {
    // Flush any remaining data if session is active
    if (this.isSessionActive && this.activationCount > 0) {
      this.flushWindow();
    }
    
    // Clear idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }

    console.log(`[FileSwitchTracker] Tracker stopped`);
  }

  private onFileActivation(fileUri: string) {
    // If session was inactive, start a new session
    if (!this.isSessionActive) {
      this.startNewSession();
    }

    // Count every activation, even if returning to the same file
    // A → B → A counts as 3 activations
    this.activationCount++;
    
    console.log(`[FileSwitchTracker] File activated: ${fileUri} (count: ${this.activationCount}, session: ${this.sessionId})`);
    
    this.lastActiveFile = fileUri;

    // Reset idle timer - user is active
    this.resetIdleTimer();
  }

  private startNewSession() {
    this.sessionId = this.generateSessionId();
    this.windowStart = new Date();
    this.activationCount = 0;
    this.isSessionActive = true;
    console.log(`[FileSwitchTracker] New session started: ${this.sessionId}`);
  }

  private startIdleTimer() {
    this.idleTimer = setTimeout(() => {
      this.onIdleTimeout();
    }, this.idleTimeoutMinutes * 60 * 1000);
  }

  private resetIdleTimer() {
    // Clear existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    // Start new timer
    this.startIdleTimer();
  }

  private onIdleTimeout() {
    console.log(`[FileSwitchTracker] Idle timeout reached (${this.idleTimeoutMinutes} min). Ending session.`);
    
    // Flush data if there were any activations
    if (this.activationCount > 0) {
      this.flushWindow();
    }

    // Mark session as inactive
    this.isSessionActive = false;
    console.log(`[FileSwitchTracker] Session ${this.sessionId} ended due to inactivity`);
  }

  private async flushWindow() {
    if (this.activationCount === 0) {
      console.log('[FileSwitchTracker] No activations in this session, skipping flush');
      return;
    }

    // Check if user is signed in
    const userId = this.authManager.getUserId();
    if (!userId) {
      console.log('[FileSwitchTracker] User not signed in, skipping data upload');
      vscode.window.showWarningMessage('Sign in with GitHub to track file switching metrics');
      this.activationCount = 0; // Reset counter
      return;
    }

    const windowEnd = new Date();
    const sessionDurationMs = windowEnd.getTime() - this.windowStart.getTime();
    const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
    const ratePerMin = sessionDurationMinutes > 0 ? this.activationCount / sessionDurationMinutes : 0;

    const payload = {
      userId: userId,              // GitHub user ID
      sessionId: this.sessionId,
      windowStart: this.windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      activationCount: this.activationCount,
      ratePerMin: parseFloat(ratePerMin.toFixed(4)),
      workspaceTag: this.getWorkspaceTag(),
    };

    console.log('[FileSwitchTracker] Flushing session data:', payload);

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/file-switch/windows`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      console.log('[FileSwitchTracker] Successfully saved session:', response.data);
      
      // Show notification
      const durationStr = sessionDurationMinutes < 1 
        ? `${Math.round(sessionDurationMinutes * 60)}s`
        : `${sessionDurationMinutes.toFixed(1)} min`;
      
      vscode.window.showInformationMessage(
        `Session ended: ${this.activationCount} file switches in ${durationStr} (rate: ${ratePerMin.toFixed(2)}/min)`
      );
    } catch (error) {
      console.error('[FileSwitchTracker] Failed to save session:', error);
      vscode.window.showErrorMessage('Failed to save file switch data');
    }

    // Reset counters (but keep session ID until next session starts)
    this.activationCount = 0;
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
