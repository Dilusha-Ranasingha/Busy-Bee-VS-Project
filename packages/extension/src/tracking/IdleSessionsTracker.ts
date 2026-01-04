import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';
const IDLE_THRESHOLD_MIN = 15;
const CHECK_INTERVAL_MS = 20000; // Check every 20 seconds

interface ActiveIdleSession {
  sessionId: string;
  idleStart: Date;
}

export class IdleSessionsTracker {
  private disposables: vscode.Disposable[] = [];
  private lastActivityAt: Date = new Date();
  private activeIdleSession: ActiveIdleSession | null = null;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor(
    private authManager: AuthManager,
    private workspaceFolder?: vscode.WorkspaceFolder
  ) {
    this.init();
  }

  private init(): void {
    // Start with current time as last activity
    this.lastActivityAt = new Date();

    // Listen to all activity events
    this.setupActivityListeners();

    // Start periodic idle check
    this.startIdleCheck();

    console.log('[IdleSessions] Tracker initialized');
  }

  private setupActivityListeners(): void {
    // 1. Edits
    const editListener = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme === 'file' && event.contentChanges.length > 0) {
        this.recordActivity('edit');
      }
    });

    // 2. Saves
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.uri.scheme === 'file') {
        this.recordActivity('save');
      }
    });

    // 3. File navigation (changing active editor)
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.recordActivity('navigation');
      }
    });

    // 4. Selection/scroll (any selection change)
    const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor.document.uri.scheme === 'file') {
        this.recordActivity('selection');
      }
    });

    // 5. Tasks
    const taskStartListener = vscode.tasks.onDidStartTaskProcess(() => {
      this.recordActivity('task_start');
    });

    const taskEndListener = vscode.tasks.onDidEndTaskProcess(() => {
      this.recordActivity('task_end');
    });

    // 6. Debug sessions
    const debugStartListener = vscode.debug.onDidStartDebugSession(() => {
      this.recordActivity('debug_start');
    });

    const debugEndListener = vscode.debug.onDidTerminateDebugSession(() => {
      this.recordActivity('debug_end');
    });

    // 7. Window focus changes
    const windowStateListener = vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        this.recordActivity('window_focus');
      }
    });

    // 8. Terminal state changes (proxy for terminal activity)
    const terminalStateListener = vscode.window.onDidChangeTerminalState((terminal) => {
      this.recordActivity('terminal_state');
    });

    // Store all disposables
    this.disposables.push(
      editListener,
      saveListener,
      editorChangeListener,
      selectionListener,
      taskStartListener,
      taskEndListener,
      debugStartListener,
      debugEndListener,
      windowStateListener,
      terminalStateListener
    );
  }

  private recordActivity(type: string): void {
    const now = new Date();
    this.lastActivityAt = now;

    // If we have an active idle session, end it
    if (this.activeIdleSession) {
      this.endIdleSession(now, 'activity');
    }

    // console.log(`[IdleSessions] Activity recorded: ${type}`);
  }

  private startIdleCheck(): void {
    this.checkTimer = setInterval(() => {
      this.checkForIdle();
    }, CHECK_INTERVAL_MS);
  }

  private checkForIdle(): void {
    const now = new Date();
    const idleMinutes = (now.getTime() - this.lastActivityAt.getTime()) / 1000 / 60;

    // If idle for >= threshold and no active idle session, start one
    if (idleMinutes >= IDLE_THRESHOLD_MIN && !this.activeIdleSession) {
      this.startIdleSession();
    }

    // Log current state for debugging (every check)
    if (this.activeIdleSession) {
      const currentIdleMin = (now.getTime() - this.activeIdleSession.idleStart.getTime()) / 1000 / 60;
      console.log(`[IdleSessions] Currently idle: ${currentIdleMin.toFixed(1)} min`);
    }
  }

  private startIdleSession(): void {
    // Idle started at lastActivityAt (when they stopped being active)
    this.activeIdleSession = {
      sessionId: this.generateSessionId(),
      idleStart: new Date(this.lastActivityAt),
    };

    console.log(
      `[IdleSessions] Idle session started at ${this.activeIdleSession.idleStart.toISOString()}`
    );
  }

  private async endIdleSession(endTime: Date, reason: string): Promise<void> {
    if (!this.activeIdleSession) {
      return;
    }

    const durationMin =
      (endTime.getTime() - this.activeIdleSession.idleStart.getTime()) / 1000 / 60;

    console.log(
      `[IdleSessions] Idle session ended: ${durationMin.toFixed(1)} min (reason: ${reason})`
    );

    // Only save if duration >= 15 min
    if (durationMin >= IDLE_THRESHOLD_MIN) {
      await this.saveSession({
        sessionId: this.activeIdleSession.sessionId,
        startTs: this.activeIdleSession.idleStart.toISOString(),
        endTs: endTime.toISOString(),
        durationMin,
        thresholdMin: IDLE_THRESHOLD_MIN,
        endedReason: reason,
      });
    } else {
      console.log(`[IdleSessions] Session too short (${durationMin.toFixed(1)} min), not saved`);
    }

    // Clear active session
    this.activeIdleSession = null;
  }

  private async saveSession(data: {
    sessionId: string;
    startTs: string;
    endTs: string;
    durationMin: number;
    thresholdMin: number;
    endedReason: string;
  }): Promise<void> {
    try {
      const user = this.authManager.getUser();
      if (!user) {
        return;
      }

      const workspaceId = this.workspaceFolder
        ? this.hashPath(this.workspaceFolder.uri.fsPath)
        : undefined;

      await axios.post(`${API_URL}/api/idle-sessions`, {
        ...data,
        userId: user.id,
        workspaceId,
      });

      console.log(
        `[IdleSessions] Session saved: ${data.durationMin.toFixed(1)} min (${data.endedReason})`
      );
    } catch (error) {
      console.error('[IdleSessions] Failed to send session:', error);
    }
  }

  private generateSessionId(): string {
    return `idle_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  public getCurrentIdleMinutes(): number | null {
    if (!this.activeIdleSession) {
      return null;
    }

    const now = new Date();
    const idleMin = (now.getTime() - this.activeIdleSession.idleStart.getTime()) / 1000 / 60;
    return idleMin;
  }

  public async dispose(): Promise<void> {
    // Stop the check timer
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    // If there's an active idle session, end it with reason 'vscode_close'
    if (this.activeIdleSession) {
      await this.endIdleSession(new Date(), 'vscode_close');
    }

    // Dispose all listeners
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    console.log('[IdleSessions] Tracker disposed');
  }
}
