import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';

interface DiagnosticSnapshot {
  fileHash: string;
  language: string | undefined;
  timestamp: Date;
  lineCount: number;
  errors: number;
  warnings: number;
  densityPerKloc: number;
}

export class DiagnosticDensityTracker {
  private disposables: vscode.Disposable[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastSnapshots = new Map<string, DiagnosticSnapshot>();
  private readonly DEBOUNCE_MS = 250;
  private readonly FLICKER_THRESHOLD_MS = 2000;

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

    // Optional: Also snapshot on save as a safety measure
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.uri.scheme === 'file') {
        this.handleDiagnosticChange(document.uri);
      }
    });

    this.disposables.push(diagnosticListener, saveListener);
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

      // Compute KLOC density
      const problems = errors + warnings;
      const kloc = Math.max(0.001, lineCount / 1000);
      const densityPerKloc = problems / kloc;

      const fileHash = this.hashPath(uri.fsPath);
      const language = document.languageId;
      const timestamp = new Date();

      const snapshot: DiagnosticSnapshot = {
        fileHash,
        language,
        timestamp,
        lineCount,
        errors,
        warnings,
        densityPerKloc,
      };

      // Check for flicker (diagnostics appear & vanish within 2s)
      const lastSnapshot = this.lastSnapshots.get(fileHash);
      if (lastSnapshot) {
        const timeDiff = timestamp.getTime() - lastSnapshot.timestamp.getTime();
        
        // If density changed from 0 to non-zero or vice versa within 2s, it's likely flicker
        if (timeDiff <= this.FLICKER_THRESHOLD_MS) {
          const wasZero = lastSnapshot.densityPerKloc === 0;
          const isZero = densityPerKloc === 0;
          
          if (wasZero !== isZero) {
            // Flicker detected - ignore this snapshot
            console.log(`[DiagnosticDensity] Flicker detected for ${fileHash}, ignoring`);
            return;
          }
        }
      }

      // Store snapshot for flicker detection
      this.lastSnapshots.set(fileHash, snapshot);

      // Send to backend
      await this.sendSnapshot(snapshot);
    } catch (error) {
      console.error('[DiagnosticDensity] Error processing snapshot:', error);
    }
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

  private async sendSnapshot(snapshot: DiagnosticSnapshot): Promise<void> {
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
        workspaceId,
        fileHash: snapshot.fileHash,
        language: snapshot.language,
        ts: snapshot.timestamp.toISOString(),
        lineCount: snapshot.lineCount,
        errors: snapshot.errors,
        warnings: snapshot.warnings,
        densityPerKloc: snapshot.densityPerKloc,
      });

      console.log(
        `[DiagnosticDensity] Event recorded: ${snapshot.densityPerKloc.toFixed(2)} per KLOC ` +
        `(${snapshot.errors}E + ${snapshot.warnings}W / ${snapshot.lineCount} LOC)`
      );
    } catch (error) {
      console.error('[DiagnosticDensity] Failed to send snapshot:', error);
    }
  }

  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  public dispose(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.lastSnapshots.clear();

    // Dispose all listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
