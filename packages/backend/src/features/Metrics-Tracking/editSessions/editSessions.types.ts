export interface CreateEditSessionInput {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  
  // Session timing
  startTs: Date;
  endTs: Date;
  durationMin: number;
  
  // Core metrics
  editsPerMin: number;
  insertCharsPerMin: number;
  deleteCharsPerMin: number;
  addDeleteRatio: number;
  
  // Total counts
  totalEdits: number;
  totalInsertChars: number;
  totalDeleteChars: number;
  
  // Optional shape metrics
  typingBurstinessIndex?: number;
  burstCount?: number;
  avgBurstLenSec?: number;
  longestPauseMin?: number;
  pasteEvents?: number;
}

export interface EditSession {
  id: string;
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
  createdAt: Date;
}

export interface GetBestSessionsParams {
  userId: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}
