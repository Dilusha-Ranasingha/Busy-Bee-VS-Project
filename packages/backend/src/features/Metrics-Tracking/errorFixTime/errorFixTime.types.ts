export interface CreateErrorFixSessionInput {
  userId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  errorKey: string;
  severity: 'error' | 'warning';
  startTs: Date;
  endTs: Date;
  durationSec: number;
}

export interface ErrorFixSession {
  id: string;
  userId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  errorKey: string;
  severity: 'error' | 'warning';
  startTs: string;
  endTs: string;
  durationSec: number;
  createdAt: string;
}

export interface ErrorFixStats {
  longest: ErrorFixSession | null;
  shortest: ErrorFixSession | null;
  average: number | null;
  total: number;
}