export interface CreateCommitEditSessionInput {
  sessionId: string;
  userId: string;
  workspaceId?: string;
  startTs: string;
  endTs: string;
  timeToCommitMin: number;
  editsPerCommit: number;
  charsAddedPerCommit: number;
  charsDeletedPerCommit: number;
  filesInCommit: number;
  linesAdded?: number;
  linesDeleted?: number;
  repoId?: string;
  commitSha?: string;
  aborted?: boolean;
}

export interface CommitEditSession {
  id: string;
  sessionId: string;
  userId: string;
  workspaceId: string | null;
  startTs: string;
  endTs: string;
  timeToCommitMin: number;
  editsPerCommit: number;
  charsAddedPerCommit: number;
  charsDeletedPerCommit: number;
  filesInCommit: number;
  linesAdded: number | null;
  linesDeleted: number | null;
  repoId: string | null;
  commitSha: string | null;
  aborted: boolean;
  createdAt: string;
}

export interface CommitEditStats {
  highest: {
    editsPerCommit: number;
    timeToCommitMin: number;
    startTs: string;
    endTs: string;
    commitSha: string | null;
  } | null;
  lowest: {
    editsPerCommit: number;
    timeToCommitMin: number;
    startTs: string;
    endTs: string;
    commitSha: string | null;
  } | null;
  todayCount: number;
}
