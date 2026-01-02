import * as vscode from 'vscode';
import axios from 'axios';
import * as crypto from 'crypto';
import { AuthManager } from '../auth/AuthManager';

interface FileStreak {
  fileHash: string;
  language: string;
  startTs: Date;
  lastActivityTs: Date;
  microSwitches: number;
}

interface GlobalStreak {
  startTs: Date;
  lastActivityTs: Date;
}

interface StreakPayload {
  userId: string;
  workspaceId?: string;
  sessionId: string;
  type: 'global' | 'per_file';
  fileHash?: string;
  language?: string;
  startTs: Date;
  endTs: Date;
  durationMin: number;
}

export class FocusStreakTracker {
  private authManager: AuthManager;
  private disposables: vscode.Disposable[] = [];
  
  // Session tracking
  private sessionId: string;
  private workspaceId?: string;
  
  // Current active file tracking
  private currentFileUri?: string;
  private currentFileStreak?: FileStreak;
  
  // Global focus tracking
  private globalStreak?: GlobalStreak;
  
  // Timers
  private globalIdleTimer?: NodeJS.Timeout;
  private microSwitchTimer?: NodeJS.Timeout;
  
  // Constants
  private readonly MICRO_SWITCH_WINDOW_MS = 30 * 1000; // 30 seconds
  private readonly GLOBAL_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly API_URL = 'http://localhost:4000/api/focus-streaks/batch';

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.sessionId = this.generateSessionId();
    this.workspaceId = this.getWorkspaceId();
    
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    // Track file activations
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.handleFileSwitch(editor.document);
        }
      })
    );

    // Track document changes (typing)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
          this.handleActivity();
        }
      })
    );

    // Track saves
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document === vscode.window.activeTextEditor?.document) {
          this.handleActivity();
        }
      })
    );

    // Track selections
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor === vscode.window.activeTextEditor) {
          this.handleActivity();
        }
      })
    );

    // Initialize with current editor if any
    if (vscode.window.activeTextEditor) {
      this.handleFileSwitch(vscode.window.activeTextEditor.document);
    }
  }

  private handleFileSwitch(document: vscode.TextDocument): void {
    const newFileUri = document.uri.toString();
    
    // Ignore non-file schemes
    if (document.uri.scheme !== 'file') {
      return;
    }

    // If switching to the same file, just update activity
    if (newFileUri === this.currentFileUri) {
      this.handleActivity();
      return;
    }

    // Check if this is a micro-switch (switching back within 30s)
    if (this.currentFileStreak && this.microSwitchTimer) {
      const fileHash = this.hashFilePath(newFileUri);
      
      // If switching back to the same file within 30s window
      if (fileHash === this.currentFileStreak.fileHash) {
        this.currentFileStreak.microSwitches++;
        this.currentFileStreak.lastActivityTs = new Date();
        this.currentFileUri = newFileUri;
        
        // Clear micro-switch timer since we're back in the same file
        clearTimeout(this.microSwitchTimer);
        this.microSwitchTimer = undefined;
        
        this.handleActivity(); // Update global streak
        return;
      }
    }

    // Actual file switch - end current file streak if any
    if (this.currentFileStreak) {
      this.endFileStreak();
    }

    // Start new file streak
    this.startFileStreak(newFileUri, document.languageId);
    this.handleActivity(); // Update global streak
  }

  private startFileStreak(fileUri: string, languageId: string): void {
    this.currentFileUri = fileUri;
    this.currentFileStreak = {
      fileHash: this.hashFilePath(fileUri),
      language: languageId,
      startTs: new Date(),
      lastActivityTs: new Date(),
      microSwitches: 0,
    };
  }

  private endFileStreak(): void {
    if (!this.currentFileStreak) {
      return;
    }

    // Don't save very short streaks (< 1 minute)
    const durationMs = this.currentFileStreak.lastActivityTs.getTime() - this.currentFileStreak.startTs.getTime();
    const durationMin = durationMs / (1000 * 60);
    
    if (durationMin >= 1) {
      this.saveFileStreak(this.currentFileStreak, durationMin);
    }

    this.currentFileStreak = undefined;
    this.currentFileUri = undefined;
  }

  private handleActivity(): void {
    const now = new Date();

    // Update current file streak
    if (this.currentFileStreak) {
      this.currentFileStreak.lastActivityTs = now;
    }

    // Update or start global streak
    if (!this.globalStreak) {
      this.startGlobalStreak();
    } else {
      this.globalStreak.lastActivityTs = now;
    }

    // Reset global idle timer
    this.resetGlobalIdleTimer();
  }

  private startGlobalStreak(): void {
    this.globalStreak = {
      startTs: new Date(),
      lastActivityTs: new Date(),
    };
  }

  private endGlobalStreak(): void {
    if (!this.globalStreak) {
      return;
    }

    const durationMs = this.globalStreak.lastActivityTs.getTime() - this.globalStreak.startTs.getTime();
    const durationMin = durationMs / (1000 * 60);
    
    // Only save global streaks >= 5 minutes
    if (durationMin >= 5) {
      this.saveGlobalStreak(this.globalStreak, durationMin);
    }

    this.globalStreak = undefined;
  }

  private resetGlobalIdleTimer(): void {
    if (this.globalIdleTimer) {
      clearTimeout(this.globalIdleTimer);
    }

    this.globalIdleTimer = setTimeout(() => {
      this.handleGlobalIdle();
    }, this.GLOBAL_IDLE_TIMEOUT_MS);
  }

  private handleGlobalIdle(): void {
    console.log('Global idle detected (10 minutes)');
    
    // End both file and global streaks
    this.endFileStreak();
    this.endGlobalStreak();
  }

  private saveFileStreak(fileStreak: FileStreak, durationMin: number): void {
    const user = this.authManager.getUser();
    if (!user) {
      console.log('Cannot save file streak - user not authenticated');
      return;
    }

    const payload: StreakPayload = {
      userId: user.id,
      workspaceId: this.workspaceId,
      sessionId: this.sessionId,
      type: 'per_file',
      fileHash: fileStreak.fileHash,
      language: fileStreak.language,
      startTs: fileStreak.startTs,
      endTs: fileStreak.lastActivityTs,
      durationMin: Math.round(durationMin * 100) / 100, // 2 decimal places
    };

    this.sendStreaksToBackend([payload]);
  }

  private saveGlobalStreak(globalStreak: GlobalStreak, durationMin: number): void {
    const user = this.authManager.getUser();
    if (!user) {
      console.log('Cannot save global streak - user not authenticated');
      return;
    }

    const payload: StreakPayload = {
      userId: user.id,
      workspaceId: this.workspaceId,
      sessionId: this.sessionId,
      type: 'global',
      startTs: globalStreak.startTs,
      endTs: globalStreak.lastActivityTs,
      durationMin: Math.round(durationMin * 100) / 100,
    };

    this.sendStreaksToBackend([payload]);
  }

  private async sendStreaksToBackend(streaks: StreakPayload[]): Promise<void> {
    try {
      console.log(`Sending ${streaks.length} streak(s) to backend:`, streaks);
      
      await axios.post(this.API_URL, streaks, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      console.log('Streaks saved successfully');
    } catch (error) {
      console.error('Failed to save streaks:', error);
    }
  }

  private hashFilePath(fileUri: string): string {
    return crypto.createHash('sha256').update(fileUri).digest('hex');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private getWorkspaceId(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return this.hashFilePath(workspaceFolders[0].uri.toString());
    }
    return undefined;
  }

  public async flushAndDispose(): Promise<void> {
    console.log('Flushing focus streak tracker...');
    
    // End current streaks
    this.endFileStreak();
    this.endGlobalStreak();
    
    // Clear timers
    if (this.globalIdleTimer) {
      clearTimeout(this.globalIdleTimer);
    }
    if (this.microSwitchTimer) {
      clearTimeout(this.microSwitchTimer);
    }
    
    // Dispose event listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  public dispose(): void {
    this.flushAndDispose();
  }
}
