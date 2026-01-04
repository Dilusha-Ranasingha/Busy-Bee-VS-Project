// Types for idle session tracking

export interface CreateIdleSessionInput {
  sessionId: string;
  userId: string;
  workspaceId?: string;
  startTs: string;
  endTs: string;
  durationMin: number;
  thresholdMin: number;
  endedReason?: string;
}

export interface IdleSession {
  id: number;
  sessionId: string;
  userId: string;
  workspaceId?: string;
  startTs: string;
  endTs: string;
  durationMin: number;
  thresholdMin: number;
  endedReason?: string;
  createdAt: string;
}

export interface IdleStats {
  longest: IdleSession | null;
  shortest: IdleSession | null;
}
