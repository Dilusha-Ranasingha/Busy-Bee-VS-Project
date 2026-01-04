export interface CreateFocusStreakInput {
  userId: string;
  workspaceId?: string;
  sessionId: string;
  type: 'global' | 'per_file';
  
  // Per-file specific (null for global)
  fileHash?: string;
  language?: string;
  
  // Timing
  startTs: Date;
  endTs: Date;
  durationMin: number;
}

export interface FocusStreak {
  id: string;
  userId: string;
  workspaceId?: string;
  sessionId: string;
  type: 'global' | 'per_file';
  fileHash?: string;
  language?: string;
  startTs: Date;
  endTs: Date;
  durationMin: number;
  createdAt: Date;
}

export interface GetBestStreaksParams {
  userId: string;
  type?: 'global' | 'per_file';
  language?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}
