import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';

interface DiagnosticSession {
  fileHash: string;
  language: string | undefined;
  sessionId: string;
  startTs: Date;
  peakLineCount: number;
  peakErrors: number;
  peakWarnings: number;
  peakDensityPerKloc: number;
}

export class DiagnosticDensityTracker {
  private disposables: vscode.Disposable[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private activeSessions = new Map<string, DiagnosticSession>();
  private readonly DEBOUNCE_MS = 250;

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
      this.processSnapshot(uri);
      this.debounceTimers.delete(fileKey);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(fileKey, timer);
  }

  private async processSnapshot(uri: vscode.Uri): Promise<void> {
    try {
      const document = await this.getDocument(uri);
      if (!document) {
        return;
      }

      const lineCount = document.lineCount;
      const diagnostics = vscode.languages.getDiagnostics(uri);

      // Count errors and warnings only (skip info/hints)
      let errors = 0;
      let warnings = 0;

      for (const diagnostic of diagnostics) {
        if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
          errors++;
        } else if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
          warnings++;
        }
      }

      const problems = errors + warnings;
      const fileHash = this.hashPath(uri.fsPath);
      const language = document.languageId;

      // Check if there's an active session for this file
      const activeSession = this.activeSessions.get(fileHash);

      if (problems === 0) {
        // No errors/warnings
        if (activeSession) {
          // Session end - errors resolved!
          await this.endSession(activeSession, lineCount);
        }
        // No session and no problems - do nothing
      } else {
        // Has errors/warnings
        if (activeSession) {
          // Update existing session with new peak if needed
          this.updateSessionPeak(activeSession, lineCount, errors, warnings);
        } else {
          // Start new session
          this.startSession(fileHash, language, lineCount, errors, warnings);
        }
      }
    } catch (error) {
      console.error('[DiagnosticDensity] Error processing snapshot:', error);
    }
  }

  private startSession(
    fileHash: string,
    language: string | undefined,
    lineCount: number,
    errors: number,
    warnings: number
  ): void {
    const kloc = Math.max(0.001, lineCount / 1000);
    const problems = errors + warnings;
    const densityPerKloc = problems / kloc;

    const session: DiagnosticSession = {
      fileHash,
      language,
      sessionId: this.generateSessionId(),
      startTs: new Date(),
      peakLineCount: lineCount,
      peakErrors: errors,
      peakWarnings: warnings,
      peakDensityPerKloc: densityPerKloc,
    };

    this.activeSessions.set(fileHash, session);
    
    console.log(
      `[DiagnosticDensity] Session started for ${fileHash}: ` +
      `${densityPerKloc.toFixed(2)} per KLOC (${errors}E + ${warnings}W)`
    );
  }

  private updateSessionPeak(
    session: DiagnosticSession,
    lineCount: number,
    errors: number,
    warnings: number
  ): void {
    const kloc = Math.max(0.001, lineCount / 1000);
    const problems = errors + warnings;
    const densityPerKloc = problems / kloc;

    // Update peak if current is higher
    if (densityPerKloc > session.peakDensityPerKloc) {
      session.peakLineCount = lineCount;
      session.peakErrors = errors;
      session.peakWarnings = warnings;
      session.peakDensityPerKloc = densityPerKloc;
      
      console.log(
        `[DiagnosticDensity] New peak for ${session.fileHash}: ` +
        `${densityPerKloc.toFixed(2)} per KLOC (${errors}E + ${warnings}W)`
      );
    }
  }

  private async endSession(session: DiagnosticSession, finalLineCount: number): Promise<void> {
    const endTs = new Date();
    const durationMin = (endTs.getTime() - session.startTs.getTime()) / 1000 / 60;

    // Remove from active sessions
    this.activeSessions.delete(session.fileHash);

    // Send to backend
    await this.sendSession(session, endTs, durationMin, finalLineCount);

    console.log(
      `[DiagnosticDensity] Session ended for ${session.fileHash}: ` +
      `${durationMin.toFixed(2)} min, peak ${session.peakDensityPerKloc.toFixed(2)} per KLOC`
    );
  }

  private async getDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
    try {
      // Try to get open document first
      const openDoc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
      if (openDoc) {
        return openDoc;
      }

      // Try to open the document
      return await vscode.workspace.openTextDocument(uri);
    } catch (error) {
      console.error('[DiagnosticDensity] Could not get document:', error);
      return undefined;
    }
  }

  private async sendSession(
    session: DiagnosticSession,
    endTs: Date,
    durationMin: number,
    finalLineCount: number
  ): Promise<void> {
    try {
      const user = this.authManager.getUser();
      if (!user) {
        return;
      }

      const workspaceId = this.workspaceFolder
        ? this.hashPath(this.workspaceFolder.uri.fsPath)
        : undefined;

      await axios.post(`${API_URL}/api/diagnostic-density`, {
        userId: user.id,
        sessionId: session.sessionId,
        workspaceId,
        fileHash: session.fileHash,
        language: session.language,
        startTs: session.startTs.toISOString(),
        endTs: endTs.toISOString(),
        durationMin,
        peakLineCount: session.peakLineCount,
        peakErrors: session.peakErrors,
        peakWarnings: session.peakWarnings,
        peakDensityPerKloc: session.peakDensityPerKloc,
        finalLineCount,
      });

      console.log(
        `[DiagnosticDensity] Session saved: Peak ${session.peakDensityPerKloc.toFixed(2)} per KLOC, ` +
        `Duration ${durationMin.toFixed(2)} min`
      );
    } catch (error) {
      console.error('[DiagnosticDensity] Failed to send session:', error);
    }
  }

  private generateSessionId(): string {
    return `diag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  public dispose(): void {
    // End all active sessions before disposing
    const promises: Promise<void>[] = [];
    for (const [fileHash, session] of this.activeSessions.entries()) {
      // End sessions with current line count (unknown, use 0)
      promises.push(this.endSession(session, 0));
    }
    
    Promise.all(promises).catch(error => {
      console.error('[DiagnosticDensity] Error ending sessions on dispose:', error);
    });

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.activeSessions.clear();

    // Dispose all listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
