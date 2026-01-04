import * as vscode from 'vscode';
import axios from 'axios';
import * as crypto from 'crypto';
import { AuthManager } from '../auth/AuthManager';

interface MinuteBucket {
  editsCount: number;
  insertChars: number;
  deleteChars: number;
  pasteEvents: number;
  startTime: number; // timestamp
}

interface SessionPayload {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  startTs: Date;
  endTs: Date;
  durationMin: number;
  editsPerMin: number;
  insertCharsPerMin: number;
  deleteCharsPerMin: number;
  addDeleteRatio: number;
  totalEdits: number;
  totalInsertChars: number;
  totalDeleteChars: number;
  typingBurstinessIndex?: number;
  burstCount?: number;
  avgBurstLenSec?: number;
  longestPauseMin?: number;
  pasteEvents?: number;
}

export class EditSessionTracker {
  private authManager: AuthManager;
  private disposables: vscode.Disposable[] = [];
  
  // Session tracking
  private sessionId: string;
  private workspaceId?: string;
  private sessionStartTime?: number;
  private lastActivityTime?: number;
  
  // Per-minute buckets
  private minuteBuckets: Map<number, MinuteBucket> = new Map();
  
  // Idle timer
  private idleTimer?: NodeJS.Timeout;
  
  // Constants
  private readonly IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly PASTE_THRESHOLD_CHARS = 100;
  private readonly API_URL = 'http://localhost:4000/api/edit-sessions';

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.sessionId = this.generateSessionId();
    this.workspaceId = this.getWorkspaceId();
    
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    // Track text document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        // Ignore non-file schemes and empty changes
        if (event.document.uri.scheme !== 'file' || event.contentChanges.length === 0) {
          return;
        }

        this.handleTextChange(event);
      })
    );
  }

  private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
    const now = Date.now();
    
    // Start session if not started
    if (!this.sessionStartTime) {
      this.sessionStartTime = now;
      console.log('[EditSessionTracker] Session started');
    }

    this.lastActivityTime = now;

    // Get current minute bucket (rounded down to minute)
    const minuteKey = Math.floor(now / 60000) * 60000;
    
    let bucket = this.minuteBuckets.get(minuteKey);
    if (!bucket) {
      bucket = {
        editsCount: 0,
        insertChars: 0,
        deleteChars: 0,
        pasteEvents: 0,
        startTime: minuteKey,
      };
      this.minuteBuckets.set(minuteKey, bucket);
    }

    // Process each content change
    for (const change of event.contentChanges) {
      bucket.editsCount++;
      
      const insertedChars = change.text.length;
      const deletedChars = change.rangeLength;
      
      bucket.insertChars += insertedChars;
      bucket.deleteChars += deletedChars;
      
      // Detect paste events (large single insertion or multi-line)
      const isLargeInsertion = insertedChars >= this.PASTE_THRESHOLD_CHARS;
      const isMultiLine = change.text.includes('\n') && insertedChars > 10;
      
      if (isLargeInsertion || isMultiLine) {
        bucket.pasteEvents++;
      }
    }

    // Reset idle timer
    this.resetIdleTimer();
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
    console.log('[EditSessionTracker] Idle timeout reached (10 min). Ending session.');
    this.endSession();
  }

  private endSession(): void {
    if (!this.sessionStartTime || this.minuteBuckets.size === 0) {
      console.log('[EditSessionTracker] No data to save (empty session)');
      this.resetSession();
      return;
    }

    const endTime = this.lastActivityTime || Date.now();
    const durationMs = endTime - this.sessionStartTime;
    const durationMin = durationMs / (1000 * 60);

    // Only save sessions >= 1 minute
    if (durationMin < 1) {
      console.log('[EditSessionTracker] Session too short, not saving');
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
      console.log('[EditSessionTracker] Cannot save session - user not authenticated');
      return null;
    }

    // Aggregate across all minute buckets
    let totalEdits = 0;
    let totalInsertChars = 0;
    let totalDeleteChars = 0;
    let totalPasteEvents = 0;

    const bucketArray = Array.from(this.minuteBuckets.values());
    
    for (const bucket of bucketArray) {
      totalEdits += bucket.editsCount;
      totalInsertChars += bucket.insertChars;
      totalDeleteChars += bucket.deleteChars;
      totalPasteEvents += bucket.pasteEvents;
    }

    // Core metrics
    const editsPerMin = totalEdits / durationMin;
    const insertCharsPerMin = totalInsertChars / durationMin;
    const deleteCharsPerMin = totalDeleteChars / durationMin;
    const addDeleteRatio = totalInsertChars / Math.max(1, totalDeleteChars);

    // Optional: Calculate burstiness (coefficient of variation of edits per minute)
    const editsPerMinArray = bucketArray.map(b => b.editsCount);
    const typingBurstinessIndex = this.calculateBurstiness(editsPerMinArray);

    // Optional: Detect bursts (minutes with high activity)
    const avgEditsPerBucket = totalEdits / bucketArray.length;
    const burstThreshold = avgEditsPerBucket * 1.5; // 150% of average
    const burstCount = editsPerMinArray.filter(e => e > burstThreshold).length;

    // Optional: Longest pause (minutes with 0 edits)
    const longestPauseMin = this.calculateLongestPause(bucketArray);

    const payload: SessionPayload = {
      userId: user.id,
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      startTs: new Date(this.sessionStartTime!),
      endTs: new Date(this.lastActivityTime!),
      durationMin: Math.round(durationMin * 100) / 100,
      editsPerMin: Math.round(editsPerMin * 100) / 100,
      insertCharsPerMin: Math.round(insertCharsPerMin * 100) / 100,
      deleteCharsPerMin: Math.round(deleteCharsPerMin * 100) / 100,
      addDeleteRatio: Math.round(addDeleteRatio * 100) / 100,
      totalEdits,
      totalInsertChars,
      totalDeleteChars,
      typingBurstinessIndex: typingBurstinessIndex ? Math.round(typingBurstinessIndex * 100) / 100 : undefined,
      burstCount: burstCount > 0 ? burstCount : undefined,
      longestPauseMin: longestPauseMin > 0 ? longestPauseMin : undefined,
      pasteEvents: totalPasteEvents > 0 ? totalPasteEvents : undefined,
    };

    return payload;
  }

  private calculateBurstiness(values: number[]): number | undefined {
    if (values.length < 2) return undefined;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return undefined;

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    return stdDev / mean;
  }

  private calculateLongestPause(buckets: MinuteBucket[]): number {
    if (buckets.length < 2) return 0;

    // Sort buckets by time
    const sorted = buckets.slice().sort((a, b) => a.startTime - b.startTime);
    
    let longestPause = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (sorted[i].startTime - sorted[i - 1].startTime) / 60000; // minutes
      if (gap > 1) {
        longestPause = Math.max(longestPause, gap - 1); // -1 because consecutive minutes have 1min gap
      }
    }

    return Math.round(longestPause);
  }

  private async saveSession(payload: SessionPayload): Promise<void> {
    try {
      console.log('[EditSessionTracker] Saving session:', {
        sessionId: payload.sessionId,
        duration: payload.durationMin,
        editsPerMin: payload.editsPerMin,
      });

      await axios.post(this.API_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[EditSessionTracker] Session saved successfully');
    } catch (error) {
      console.error('[EditSessionTracker] Failed to save session:', error);
    }
  }

  private resetSession(): void {
    this.sessionStartTime = undefined;
    this.lastActivityTime = undefined;
    this.minuteBuckets.clear();
    this.sessionId = this.generateSessionId();
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  private generateSessionId(): string {
    return `edit_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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
    console.log('[EditSessionTracker] Flushing...');
    
    // End current session if active
    if (this.sessionStartTime && this.minuteBuckets.size > 0) {
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
