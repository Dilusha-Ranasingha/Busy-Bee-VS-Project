import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';
const SESSION_TIMEOUT_MS = 60000; // 1 minute
const EDIT_TRACKING_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface ErrorSessionData {
  fileUri: string;
  fileHash: string;
  language: string | undefined;
  sessionId: string;
  sessionStartTime: Date;
  errorCount: number;
  errorMessages: string[];
  sessionTimer: NodeJS.Timeout | null;
  insertions15m: number;
  deletions15m: number;
}

interface EditEvent {
  timestamp: Date;
  insertions: number;
  deletions: number;
}

export class ErrorSessionTracker {
  private disposables: vscode.Disposable[] = [];
  private activeSessions = new Map<string, ErrorSessionData>();
  private editHistory = new Map<string, EditEvent[]>();
  
  constructor(
    private authManager: AuthManager,
    private workspaceFolder?: vscode.WorkspaceFolder
  ) {
    this.init();
  }

  private init(): void {
    // Monitor diagnostics changes (errors appearing/disappearing)
    const diagnosticListener = vscode.languages.onDidChangeDiagnostics((event) => {
      for (const uri of event.uris) {
        if (uri.scheme === 'file') {
          this.handleDiagnosticChange(uri);
        }
      }
    });

    // Monitor text document changes to track edits
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme === 'file') {
        this.trackEdits(event);
      }
    });

    // Monitor task execution (build failures)
    const taskStartListener = vscode.tasks.onDidStartTask((event) => {
      this.handleTaskStart(event);
    });

    const taskEndListener = vscode.tasks.onDidEndTask((event) => {
      this.handleTaskEnd(event);
    });

    this.disposables.push(
      diagnosticListener,
      textChangeListener,
      taskStartListener,
      taskEndListener
    );
  }

  /**
   * Handle diagnostic changes (errors appearing/disappearing)
   */
  private async handleDiagnosticChange(uri: vscode.Uri): Promise<void> {
    try {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      
      // Count only errors (not warnings)
      const errors = diagnostics.filter(
        d => d.severity === vscode.DiagnosticSeverity.Error
      );

      const errorMessages = errors.map(e => 
        `[Line ${e.range.start.line + 1}] ${e.message}`
      );

      const fileKey = uri.toString();
      const activeSession = this.activeSessions.get(fileKey);

      if (errors.length === 0) {
        // No errors - end session if active
        if (activeSession) {
          await this.endSession(fileKey, activeSession);
        }
      } else {
        // Has errors
        if (activeSession) {
          // Update existing session
          this.updateSession(activeSession, errors.length, errorMessages);
        } else {
          // Start new session
          await this.startSession(uri, errors.length, errorMessages);
        }
      }
    } catch (error) {
      console.error('[ErrorSessionTracker] Error handling diagnostic change:', error);
    }
  }

  /**
   * Start a new error session
   */
  private async startSession(
    uri: vscode.Uri,
    errorCount: number,
    errorMessages: string[]
  ): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const fileKey = uri.toString();
      const fileHash = this.hashPath(uri.fsPath);
      const sessionId = this.generateSessionId();

      const session: ErrorSessionData = {
        fileUri: uri.toString(),
        fileHash,
        language: document.languageId,
        sessionId,
        sessionStartTime: new Date(),
        errorCount,
        errorMessages: [...errorMessages],
        sessionTimer: null,
        insertions15m: 0,
        deletions15m: 0
      };

      // Set timeout for session end (1 minute of no new errors)
      session.sessionTimer = setTimeout(() => {
        this.endSession(fileKey, session);
      }, SESSION_TIMEOUT_MS);

      this.activeSessions.set(fileKey, session);

      console.log(
        `[ErrorSessionTracker] Session started for ${uri.fsPath}: ` +
        `${errorCount} errors`
      );
    } catch (error) {
      console.error('[ErrorSessionTracker] Error starting session:', error);
    }
  }

  /**
   * Update existing session with new error information
   */
  private updateSession(
    session: ErrorSessionData,
    errorCount: number,
    errorMessages: string[]
  ): void {
    // Update error count and messages
    session.errorCount = errorCount;
    session.errorMessages = [...errorMessages];

    // Reset the timeout (another minute from now)
    if (session.sessionTimer) {
      clearTimeout(session.sessionTimer);
    }

    session.sessionTimer = setTimeout(() => {
      const fileKey = session.fileUri;
      this.endSession(fileKey, session);
    }, SESSION_TIMEOUT_MS);

    console.log(
      `[ErrorSessionTracker] Session updated: ${errorCount} errors`
    );
  }

  /**
   * End error session and send to backend
   */
  private async endSession(
    fileKey: string,
    session: ErrorSessionData
  ): Promise<void> {
    try {
      // Clear timeout
      if (session.sessionTimer) {
        clearTimeout(session.sessionTimer);
      }

      // Remove from active sessions
      this.activeSessions.delete(fileKey);

      const sessionEndTime = new Date();

      // Calculate recent edits (last 15 minutes from session start)
      const { insertions, deletions } = this.getRecentEdits(fileKey, session.sessionStartTime);
      
      // Get LOC
      const uri = vscode.Uri.parse(session.fileUri);
      const document = await vscode.workspace.openTextDocument(uri);
      const loc = document.lineCount;

      // Get user info
      const user = this.authManager.getUser();
      if (!user) {
        console.warn('[ErrorSessionTracker] No authenticated user, skipping session save');
        return;
      }

      // Prepare payload
      const payload = {
        session_id: session.sessionId,
        user_id: user.id.toString(),
        workspace_id: this.workspaceFolder?.name,
        file_uri: session.fileUri,
        file_hash: session.fileHash,
        language: session.language,
        loc,
        error_count_session: session.errorCount,
        insertions_15m: insertions,
        deletions_15m: deletions,
        all_error_messages: session.errorMessages,
        session_start_time: session.sessionStartTime.toISOString(),
        session_end_time: sessionEndTime.toISOString()
      };

      // Send to backend
      await axios.post(`${API_URL}/api/code-risk/error-sessions`, payload);

      console.log(
        `[ErrorSessionTracker] Session ended and saved: ` +
        `${session.errorCount} errors, ${insertions} insertions, ${deletions} deletions`
      );

      // Trigger Gemini analysis (get the error session ID from response)
      const response = await axios.post(`${API_URL}/api/code-risk/error-sessions`, payload);
      const errorSessionId = response.data.id;
      
      // Request risk analysis
      await axios.post(
        `${API_URL}/api/code-risk/risk-results/from-session/${errorSessionId}`
      );

      console.log('[ErrorSessionTracker] Gemini risk analysis requested');

    } catch (error) {
      console.error('[ErrorSessionTracker] Error ending session:', error);
    }
  }

  /**
   * Track text edits
   */
  private trackEdits(event: vscode.TextDocumentChangeEvent): void {
    const fileKey = event.document.uri.toString();
    
    let totalInsertions = 0;
    let totalDeletions = 0;

    for (const change of event.contentChanges) {
      const insertions = change.text.length;
      const deletions = change.rangeLength;
      
      totalInsertions += insertions;
      totalDeletions += deletions;
    }

    // Only track if there were actual changes
    if (totalInsertions > 0 || totalDeletions > 0) {
      const editEvent: EditEvent = {
        timestamp: new Date(),
        insertions: totalInsertions,
        deletions: totalDeletions
      };

      // Get or create edit history for this file
      let history = this.editHistory.get(fileKey);
      if (!history) {
        history = [];
        this.editHistory.set(fileKey, history);
      }

      history.push(editEvent);

      // Clean up old edit events (older than 15 minutes)
      this.cleanupOldEdits(fileKey);
    }
  }

  /**
   * Get recent edits (within 15 minutes from reference time)
   */
  private getRecentEdits(fileKey: string, referenceTime: Date): {
    insertions: number;
    deletions: number;
  } {
    const history = this.editHistory.get(fileKey);
    if (!history) {
      return { insertions: 0, deletions: 0 };
    }

    const cutoffTime = new Date(referenceTime.getTime() - EDIT_TRACKING_WINDOW_MS);
    
    let insertions = 0;
    let deletions = 0;

    for (const event of history) {
      if (event.timestamp >= cutoffTime && event.timestamp <= referenceTime) {
        insertions += event.insertions;
        deletions += event.deletions;
      }
    }

    return { insertions, deletions };
  }

  /**
   * Clean up old edit events
   */
  private cleanupOldEdits(fileKey: string): void {
    const history = this.editHistory.get(fileKey);
    if (!history) {
      return;
    }

    const cutoffTime = new Date(Date.now() - EDIT_TRACKING_WINDOW_MS);
    
    // Filter out old events
    const recentEvents = history.filter(event => event.timestamp >= cutoffTime);
    
    if (recentEvents.length === 0) {
      this.editHistory.delete(fileKey);
    } else {
      this.editHistory.set(fileKey, recentEvents);
    }
  }

  /**
   * Handle task start (build/test)
   */
  private handleTaskStart(event: vscode.TaskStartEvent): void {
    // Can be used to track when builds start
    console.log('[ErrorSessionTracker] Task started:', event.execution.task.name);
  }

  /**
   * Handle task end (build/test)
   */
  private handleTaskEnd(event: vscode.TaskEndEvent): void {
    // If build failed, we might already have errors in diagnostics
    // The diagnostic listener will handle them
    console.log('[ErrorSessionTracker] Task ended:', event.execution.task.name);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `error-session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Hash file path
   */
  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  /**
   * Dispose tracker
   */
  public dispose(): void {
    // Clear all active session timers
    for (const session of this.activeSessions.values()) {
      if (session.sessionTimer) {
        clearTimeout(session.sessionTimer);
      }
    }

    this.activeSessions.clear();
    this.editHistory.clear();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
