import * as vscode from 'vscode';
import axios from 'axios';
import * as crypto from 'crypto';
import { AuthManager } from '../auth/AuthManager';

interface SaveEvent {
  timestamp: number;
  type: 'manual' | 'autosave_delay' | 'autosave_focusout';
}

interface SessionPayload {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  startTs: Date;
  endTs: Date;
  durationMin: number;
  editsTotal: number;
  savesManual: number;
  savesAutosaveDelay: number;
  savesAutosaveFocusout: number;
  autosavesEffective: number;
  checkpointAutosaveCount: number;
  saveToEditRatioManual: number;
  saveToEditRatioAutosave: number;
  effectiveSaveToEditRatio: number;
  avgSecsBetweenSaves?: number;
  medianSecsBetweenSaves?: number;
  manualSaveShare?: number;
  collapseWindowSec: number;
}

export class SaveEditSessionTracker {
  private authManager: AuthManager;
  private disposables: vscode.Disposable[] = [];
  
  // Session tracking
  private sessionId: string;
  private workspaceId?: string;
  private sessionStartTime?: number;
  private lastEditTime?: number;
  private lastSaveTime?: number;
  
  // Counts
  private editsTotal: number = 0;
  private savesManual: number = 0;
  private savesAutosaveDelay: number = 0;
  private savesAutosaveFocusout: number = 0;
  
  // Save events for spacing calculations
  private saveEvents: SaveEvent[] = [];
  
  // Idle timer
  private idleTimer?: NodeJS.Timeout;
  
  // Constants
  private readonly IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly CHECKPOINT_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly COLLAPSE_WINDOW_MS = 60 * 1000; // 1 minute for auto-save compression
  private readonly API_URL = 'http://localhost:4000/api/save-edit-sessions';

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.sessionId = this.generateSessionId();
    this.workspaceId = this.getWorkspaceId();
    
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    // Track text document changes (edits)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.scheme !== 'file' || event.contentChanges.length === 0) {
          return;
        }

        this.handleEdit(event);
      })
    );

    // Track manual saves
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.scheme !== 'file') {
          return;
        }

        this.handleSave(document);
      })
    );
  }

  private handleEdit(event: vscode.TextDocumentChangeEvent): void {
    const now = Date.now();
    
    // Start session if not started
    if (!this.sessionStartTime) {
      this.sessionStartTime = now;
      console.log('[SaveEditSessionTracker] Session started');
    }

    this.lastEditTime = now;
    this.editsTotal += event.contentChanges.length;

    // Reset idle timer
    this.resetIdleTimer();
  }

  private handleSave(document: vscode.TextDocument): void {
    const now = Date.now();
    this.lastSaveTime = now;

    // Determine save type
    const saveType = this.detectSaveType();
    
    const saveEvent: SaveEvent = {
      timestamp: now,
      type: saveType,
    };

    this.saveEvents.push(saveEvent);

    // Increment counters
    if (saveType === 'manual') {
      this.savesManual++;
      console.log(`[SaveEditSessionTracker] Manual save detected (total: ${this.savesManual})`);
    } else if (saveType === 'autosave_delay') {
      this.savesAutosaveDelay++;
    } else if (saveType === 'autosave_focusout') {
      this.savesAutosaveFocusout++;
    }
  }

  private detectSaveType(): 'manual' | 'autosave_delay' | 'autosave_focusout' {
    // Check VS Code auto-save settings
    const autoSaveConfig = vscode.workspace.getConfiguration('files').get<string>('autoSave');
    
    if (autoSaveConfig === 'off') {
      // No auto-save, must be manual
      return 'manual';
    }

    // If there was a recent edit (within 2 seconds), likely auto-save
    if (this.lastEditTime && (Date.now() - this.lastEditTime) < 2000) {
      if (autoSaveConfig === 'afterDelay') {
        return 'autosave_delay';
      } else if (autoSaveConfig === 'onFocusChange') {
        return 'autosave_focusout';
      }
    }

    // If no recent edit, treat as manual (user explicitly saved)
    return 'manual';
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.IDLE_TIMEOUT_MS);
  }

  private handleIdleTimeout(): void {
    console.log('[SaveEditSessionTracker] Idle timeout reached (10 min). Ending session.');
    this.endSession();
  }

  private endSession(): void {
    if (!this.sessionStartTime || this.editsTotal === 0) {
      console.log('[SaveEditSessionTracker] No data to save (empty session)');
      this.resetSession();
      return;
    }

    const endTime = this.lastEditTime || Date.now();
    const durationMs = endTime - this.sessionStartTime;
    const durationMin = durationMs / (1000 * 60);

    // Only save sessions >= 1 minute
    if (durationMin < 1) {
      console.log('[SaveEditSessionTracker] Session too short, not saving');
      this.resetSession();
      return;
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(durationMin);
    
    if (metrics) {
      this.saveSession(metrics);
    }

    this.resetSession();
  }

  private calculateMetrics(durationMin: number): SessionPayload | null {
    const user = this.authManager.getUser();
    if (!user) {
      console.log('[SaveEditSessionTracker] Cannot save session - user not authenticated');
      return null;
    }

    // Compress auto-saves into effective saves
    const { autosavesEffective, checkpointAutosaveCount } = this.compressAutosaves();

    // Calculate ratios
    const saveToEditRatioManual = this.savesManual / Math.max(1, this.editsTotal);
    const saveToEditRatioAutosave = autosavesEffective / Math.max(1, this.editsTotal);
    const effectiveSaveToEditRatio = (this.savesManual + autosavesEffective) / Math.max(1, this.editsTotal);

    // Calculate spacing between saves
    const { avgSecsBetweenSaves, medianSecsBetweenSaves } = this.calculateSaveSpacing();

    // Calculate manual save share
    const totalRawSaves = this.savesManual + this.savesAutosaveDelay + this.savesAutosaveFocusout;
    const manualSaveShare = totalRawSaves > 0 ? this.savesManual / totalRawSaves : 0;

    const payload: SessionPayload = {
      userId: user.id,
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      startTs: new Date(this.sessionStartTime!),
      endTs: new Date(this.lastEditTime!),
      durationMin: Math.round(durationMin * 100) / 100,
      editsTotal: this.editsTotal,
      savesManual: this.savesManual,
      savesAutosaveDelay: this.savesAutosaveDelay,
      savesAutosaveFocusout: this.savesAutosaveFocusout,
      autosavesEffective,
      checkpointAutosaveCount,
      saveToEditRatioManual: Math.round(saveToEditRatioManual * 10000) / 10000,
      saveToEditRatioAutosave: Math.round(saveToEditRatioAutosave * 10000) / 10000,
      effectiveSaveToEditRatio: Math.round(effectiveSaveToEditRatio * 10000) / 10000,
      avgSecsBetweenSaves: avgSecsBetweenSaves ? Math.round(avgSecsBetweenSaves) : undefined,
      medianSecsBetweenSaves: medianSecsBetweenSaves ? Math.round(medianSecsBetweenSaves) : undefined,
      manualSaveShare: Math.round(manualSaveShare * 100) / 100,
      collapseWindowSec: 60,
    };

    return payload;
  }

  private compressAutosaves(): { autosavesEffective: number; checkpointAutosaveCount: number } {
    let autosavesEffective = 0;
    let checkpointAutosaveCount = 0;

    // Filter out manual saves to process only auto-saves
    const autoSaveEvents = this.saveEvents.filter(
      e => e.type === 'autosave_delay' || e.type === 'autosave_focusout'
    );

    if (autoSaveEvents.length === 0) {
      return { autosavesEffective: 0, checkpointAutosaveCount: 0 };
    }

    let currentClusterStart = autoSaveEvents[0].timestamp;
    let lastSaveInCluster = autoSaveEvents[0].timestamp;
    let isCheckpoint = false;

    for (let i = 0; i < autoSaveEvents.length; i++) {
      const currentSave = autoSaveEvents[i];
      const timeSinceLastSave = currentSave.timestamp - lastSaveInCluster;

      // Check if this save happened after ≥1 min with no edits (checkpoint)
      if (this.lastEditTime && (currentSave.timestamp - this.lastEditTime) >= this.CHECKPOINT_WINDOW_MS) {
        isCheckpoint = true;
      }

      // If gap > collapse window, finalize current cluster and start new one
      if (timeSinceLastSave >= this.COLLAPSE_WINDOW_MS) {
        // Finalize current cluster
        autosavesEffective++;
        if (isCheckpoint) {
          checkpointAutosaveCount++;
        }

        // Start new cluster
        currentClusterStart = currentSave.timestamp;
        isCheckpoint = false;
      }

      lastSaveInCluster = currentSave.timestamp;
    }

    // Finalize last cluster
    autosavesEffective++;
    if (isCheckpoint) {
      checkpointAutosaveCount++;
    }

    return { autosavesEffective, checkpointAutosaveCount };
  }

  private calculateSaveSpacing(): { avgSecsBetweenSaves?: number; medianSecsBetweenSaves?: number } {
    if (this.saveEvents.length < 2) {
      return {};
    }

    // Calculate gaps between consecutive saves
    const gaps: number[] = [];
    for (let i = 1; i < this.saveEvents.length; i++) {
      const gap = (this.saveEvents[i].timestamp - this.saveEvents[i - 1].timestamp) / 1000; // seconds
      gaps.push(gap);
    }

    // Average
    const avgSecsBetweenSaves = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Median
    const sorted = gaps.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianSecsBetweenSaves = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    return { avgSecsBetweenSaves, medianSecsBetweenSaves };
  }

  private async saveSession(payload: SessionPayload): Promise<void> {
    try {
      console.log('[SaveEditSessionTracker] Saving session:', {
        sessionId: payload.sessionId,
        duration: payload.durationMin,
        editsTotal: payload.editsTotal,
        effectiveRatio: payload.effectiveSaveToEditRatio,
      });

      await axios.post(this.API_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[SaveEditSessionTracker] Session saved successfully');
    } catch (error) {
      console.error('[SaveEditSessionTracker] Failed to save session:', error);
    }
  }

  private resetSession(): void {
    this.sessionStartTime = undefined;
    this.lastEditTime = undefined;
    this.lastSaveTime = undefined;
    this.editsTotal = 0;
    this.savesManual = 0;
    this.savesAutosaveDelay = 0;
    this.savesAutosaveFocusout = 0;
    this.saveEvents = [];
    this.sessionId = this.generateSessionId();
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  private generateSessionId(): string {
    return `save_edit_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private getWorkspaceId(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return crypto.createHash('sha256')
        .update(workspaceFolders[0].uri.toString())
        .digest('hex');
    }
    return undefined;
  }

  public async flushAndDispose(): Promise<void> {
    console.log('[SaveEditSessionTracker] Flushing...');
    
    // End current session if active
    if (this.sessionStartTime && this.editsTotal > 0) {
      this.endSession();
    }
    
    // Clear timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    // Dispose event listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  public dispose(): void {
    this.flushAndDispose();
  }
}
