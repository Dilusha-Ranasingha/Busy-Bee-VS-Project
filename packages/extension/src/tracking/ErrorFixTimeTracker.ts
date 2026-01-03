import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';

interface ErrorRecord {
  errorKey: string;
  fileHash: string;
  language: string | undefined;
  severity: 'error' | 'warning';
  startTs: Date;
  lastSeenTs: Date;
  flickerDisappearTs?: Date; // For handling quick reappear
}

export class ErrorFixTimeTracker {
  private disposables: vscode.Disposable[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private activeErrors = new Map<string, ErrorRecord>();
  private readonly DEBOUNCE_MS = 250;
  private readonly FLICKER_THRESHOLD_MS = 2000; // Ignore if fixed within 2s
  private readonly REAPPEAR_THRESHOLD_MS = 5000; // Treat as continuation if reappears within 5s

  constructor(
    private authManager: AuthManager,
    private workspaceFolder?: vscode.WorkspaceFolder
  ) {
    this.init();
  }

  private init(): void {
    // Monitor diagnostics changes
    const diagnosticListener = vscode.languages.onDidChangeDiagnostics((event) => {
      for (const uri of event.uris) {
        if (uri.scheme === 'file') {
          this.handleDiagnosticChange(uri);
        }
      }
    });

    this.disposables.push(diagnosticListener);
  }

  private handleDiagnosticChange(uri: vscode.Uri): void {
    const fileKey = uri.fsPath;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(fileKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processDiagnostics(uri);
      this.debounceTimers.delete(fileKey);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(fileKey, timer);
  }

  private async processDiagnostics(uri: vscode.Uri): Promise<void> {
    try {
      const document = await this.getDocument(uri);
      if (!document) {
        return;
      }

      const fileHash = this.hashPath(uri.fsPath);
      const language = document.languageId;
      const diagnostics = vscode.languages.getDiagnostics(uri);
      
      // Build current error keys
      const currentErrorKeys = new Set<string>();
      
      for (const diagnostic of diagnostics) {
        // Only track errors (optionally add warnings later)
        if (diagnostic.severity !== vscode.DiagnosticSeverity.Error) {
          continue;
        }

        const errorKey = this.buildErrorKey(fileHash, diagnostic);
        currentErrorKeys.add(errorKey);

        // Check if this error is already being tracked
        const existingRecord = this.activeErrors.get(errorKey);
        
        if (existingRecord) {
          // Error still exists - update last seen time
          existingRecord.lastSeenTs = new Date();
          
          // Clear flicker disappear time if it was set (error reappeared)
          if (existingRecord.flickerDisappearTs) {
            const timeSinceDisappear = Date.now() - existingRecord.flickerDisappearTs.getTime();
            
            if (timeSinceDisappear <= this.REAPPEAR_THRESHOLD_MS) {
              // Reappeared within 5s - treat as continuation
              console.log(`[ErrorFixTime] Error ${errorKey} reappeared within 5s - continuing session`);
            }
            
            // Clear the flicker marker
            existingRecord.flickerDisappearTs = undefined;
          }
        } else {
          // New error - start tracking
          this.startTracking(errorKey, fileHash, language, 'error');
        }
      }

      // Find errors that disappeared
      const disappearedErrors: string[] = [];
      for (const [errorKey, record] of this.activeErrors.entries()) {
        if (record.fileHash === fileHash && !currentErrorKeys.has(errorKey)) {
          disappearedErrors.push(errorKey);
        }
      }

      // Handle disappeared errors
      for (const errorKey of disappearedErrors) {
        await this.handleErrorDisappeared(errorKey);
      }
    } catch (error) {
      console.error('[ErrorFixTime] Error processing diagnostics:', error);
    }
  }

  private startTracking(
    errorKey: string,
    fileHash: string,
    language: string | undefined,
    severity: 'error' | 'warning'
  ): void {
    const record: ErrorRecord = {
      errorKey,
      fileHash,
      language,
      severity,
      startTs: new Date(),
      lastSeenTs: new Date(),
    };

    this.activeErrors.set(errorKey, record);
    console.log(`[ErrorFixTime] Started tracking error: ${errorKey}`);
  }

  private async handleErrorDisappeared(errorKey: string): Promise<void> {
    const record = this.activeErrors.get(errorKey);
    if (!record) {
      return;
    }

    const now = new Date();
    
    // If we already marked it as disappeared (flicker check ongoing)
    if (record.flickerDisappearTs) {
      const flickerDuration = now.getTime() - record.flickerDisappearTs.getTime();
      
      // Still within flicker threshold - ignore
      if (flickerDuration <= this.FLICKER_THRESHOLD_MS) {
        console.log(`[ErrorFixTime] Error ${errorKey} flicker detected - ignoring`);
        this.activeErrors.delete(errorKey);
        return;
      }
    } else {
      // First time we see it disappeared - mark for flicker check
      record.flickerDisappearTs = now;
      
      // Schedule a check after flicker threshold
      setTimeout(async () => {
        await this.checkAndEndSession(errorKey);
      }, this.FLICKER_THRESHOLD_MS + 100);
      
      return;
    }
  }

  private async checkAndEndSession(errorKey: string): Promise<void> {
    const record = this.activeErrors.get(errorKey);
    if (!record || !record.flickerDisappearTs) {
      return;
    }

    const endTs = record.flickerDisappearTs;
    const durationSec = Math.floor((endTs.getTime() - record.startTs.getTime()) / 1000);

    // Remove from tracking
    this.activeErrors.delete(errorKey);

    // Only save if duration >= 60 seconds
    if (durationSec < 60) {
      console.log(
        `[ErrorFixTime] Error ${errorKey} fixed in ${durationSec}s - below 60s threshold, not saving`
      );
      return;
    }

    // Save to backend
    await this.sendSession(record, endTs, durationSec);
  }

  private buildErrorKey(fileHash: string, diagnostic: vscode.Diagnostic): string {
    // Use diagnostic code if available, otherwise hash the message
    const errorId = diagnostic.code
      ? String(diagnostic.code)
      : this.hashString(diagnostic.message);
    
    const startLine = diagnostic.range.start.line;
    
    return `${fileHash}|${errorId}|${startLine}`;
  }

  private async getDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
    try {
      const openDoc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
      if (openDoc) {
        return openDoc;
      }
      return await vscode.workspace.openTextDocument(uri);
    } catch (error) {
      console.error('[ErrorFixTime] Could not get document:', error);
      return undefined;
    }
  }

  private async sendSession(
    record: ErrorRecord,
    endTs: Date,
    durationSec: number
  ): Promise<void> {
    try {
      const user = this.authManager.getUser();
      if (!user) {
        return;
      }

      const workspaceId = this.workspaceFolder
        ? this.hashPath(this.workspaceFolder.uri.fsPath)
        : undefined;

      await axios.post(`${API_URL}/api/error-fix-time`, {
        userId: user.id,
        workspaceId,
        fileHash: record.fileHash,
        language: record.language,
        errorKey: record.errorKey,
        severity: record.severity,
        startTs: record.startTs.toISOString(),
        endTs: endTs.toISOString(),
        durationSec,
      });

      console.log(
        `[ErrorFixTime] Session saved: ${record.errorKey} - ${durationSec}s (${(durationSec / 60).toFixed(1)} min)`
      );
    } catch (error) {
      console.error('[ErrorFixTime] Failed to send session:', error);
    }
  }

  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  private hashString(str: string): string {
    return createHash('sha256').update(str).digest('hex').substring(0, 12);
  }

  public dispose(): void {
    // End all active error sessions
    // Note: We don't save these because we don't have end times (extension closing)
    this.activeErrors.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Dispose all listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
