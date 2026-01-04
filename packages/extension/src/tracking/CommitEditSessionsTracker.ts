import * as vscode from 'vscode';
import axios from 'axios';
import { createHash } from 'crypto';
import { AuthManager } from '../auth/AuthManager';

const API_URL = 'http://localhost:4000';

interface ActiveSession {
  sessionId: string;
  startTime: Date;
  edits: number;
  charsAdded: number;
  charsDeleted: number;
}

export class CommitEditSessionsTracker {
  private disposables: vscode.Disposable[] = [];
  private activeSession: ActiveSession | null = null;
  private gitExtension: any;
  private lastCommitSha: string | null = null; // Track last commit to detect new commits

  constructor(
    private authManager: AuthManager,
    private workspaceFolder?: vscode.WorkspaceFolder
  ) {
    this.init();
  }

  private async init(): Promise<void> {
    // Get Git extension
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (gitExt) {
      if (!gitExt.isActive) {
        await gitExt.activate();
      }
      this.gitExtension = gitExt.exports;
      
      // Listen to Git state changes
      const api = this.gitExtension.getAPI(1);
      if (api) {
        // Watch for repository state changes (commits)
        api.repositories.forEach((repo: any) => {
          const stateListener = repo.state.onDidChange(() => {
            this.handleRepositoryStateChange(repo);
          });
          this.disposables.push(stateListener);
        });
      }
    }

    // Listen to text document changes (edits)
    const editListener = vscode.workspace.onDidChangeTextDocument((event) => {
      this.handleEdit(event);
    });

    this.disposables.push(editListener);

    // Start initial session
    this.startNewSession();
  }

  private handleEdit(event: vscode.TextDocumentChangeEvent): void {
    // Ignore untitled documents, output, and non-file schemes
    if (
      event.document.uri.scheme !== 'file' ||
      event.document.isUntitled ||
      event.contentChanges.length === 0
    ) {
      return;
    }

    // If no active session, start one
    if (!this.activeSession) {
      this.startNewSession();
    }

    // Count edits and characters
    const edits = event.contentChanges.length;
    let charsAdded = 0;
    let charsDeleted = 0;

    for (const change of event.contentChanges) {
      charsAdded += change.text.length;
      charsDeleted += change.rangeLength;
    }

    if (this.activeSession) {
      this.activeSession.edits += edits;
      this.activeSession.charsAdded += charsAdded;
      this.activeSession.charsDeleted += charsDeleted;

      console.log(
        `[CommitEditSessions] Edits: ${this.activeSession.edits}, +${this.activeSession.charsAdded}, -${this.activeSession.charsDeleted}`
      );
    }
  }

  private async handleRepositoryStateChange(repo: any): Promise<void> {
    // Check if HEAD changed (commit happened)
    const head = repo.state.HEAD;
    if (!head || !head.commit) {
      return;
    }

    const currentCommitSha = head.commit;

    // Only process if this is a NEW commit (SHA changed)
    if (this.lastCommitSha === currentCommitSha) {
      return; // Same commit, ignore
    }

    // Update last commit SHA
    const previousCommitSha = this.lastCommitSha;
    this.lastCommitSha = currentCommitSha;

    // Skip the first commit detection (when we initialize)
    if (previousCommitSha === null) {
      console.log(`[CommitEditSessions] Initial commit detected: ${currentCommitSha.substring(0, 7)}`);
      return;
    }

    // A new commit was made! Save the session if we have edits
    console.log(`[CommitEditSessions] New commit detected: ${currentCommitSha.substring(0, 7)}`);
    
    if (this.activeSession && this.activeSession.edits > 0) {
      await this.saveSession(repo, currentCommitSha);
      // Start a new session
      this.startNewSession();
    }
  }

  private startNewSession(): void {
    this.activeSession = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      edits: 0,
      charsAdded: 0,
      charsDeleted: 0,
    };

    console.log(`[CommitEditSessions] New session started: ${this.activeSession.sessionId}`);
  }

  private async saveSession(repo: any, commitSha: string): Promise<void> {
    if (!this.activeSession || this.activeSession.edits === 0) {
      return;
    }

    const endTime = new Date();
    const durationMin =
      (endTime.getTime() - this.activeSession.startTime.getTime()) / 1000 / 60;

    // Get commit info
    let filesInCommit = 0;
    let linesAdded: number | undefined;
    let linesDeleted: number | undefined;

    try {
      // Try to get the last commit
      const commits = await repo.log({ maxEntries: 1 });
      if (commits && commits.length > 0) {
        const commit = commits[0];
        
        // Count files in commit - try different approaches
        if (commit.changes) {
          filesInCommit = commit.changes.length;
        } else {
          // Fallback: get diff stats if available
          const diffResult = await repo.diffIndexWithHEAD();
          if (diffResult) {
            filesInCommit = diffResult.length;
          }
        }
      }
    } catch (error) {
      console.error('[CommitEditSessions] Error getting commit info:', error);
      // Continue with filesInCommit = 0
    }

    await this.sendSession({
      sessionId: this.activeSession.sessionId,
      startTs: this.activeSession.startTime.toISOString(),
      endTs: endTime.toISOString(),
      timeToCommitMin: durationMin,
      editsPerCommit: this.activeSession.edits,
      charsAddedPerCommit: this.activeSession.charsAdded,
      charsDeletedPerCommit: this.activeSession.charsDeleted,
      filesInCommit,
      linesAdded,
      linesDeleted,
      repoId: this.hashPath(repo.rootUri.fsPath),
      commitSha,
    });
  }

  private async sendSession(data: {
    sessionId: string;
    startTs: string;
    endTs: string;
    timeToCommitMin: number;
    editsPerCommit: number;
    charsAddedPerCommit: number;
    charsDeletedPerCommit: number;
    filesInCommit: number;
    linesAdded?: number;
    linesDeleted?: number;
    repoId: string;
    commitSha: string;
  }): Promise<void> {
    try {
      const user = this.authManager.getUser();
      if (!user) {
        return;
      }

      const workspaceId = this.workspaceFolder
        ? this.hashPath(this.workspaceFolder.uri.fsPath)
        : undefined;

      await axios.post(`${API_URL}/api/commit-edit-sessions`, {
        ...data,
        userId: user.id,
        workspaceId,
      });

      console.log(
        `[CommitEditSessions] Session saved: ${data.editsPerCommit} edits in ${data.timeToCommitMin.toFixed(1)}min`
      );
    } catch (error) {
      console.error('[CommitEditSessions] Failed to send session:', error);
    }
  }

  private generateSessionId(): string {
    return `ces_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private hashPath(path: string): string {
    return createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  public getCurrentEdits(): number {
    return this.activeSession?.edits || 0;
  }

  public dispose(): void {
    // Don't save the active session on dispose (aborted)
    this.activeSession = null;

    // Dispose all listeners
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
