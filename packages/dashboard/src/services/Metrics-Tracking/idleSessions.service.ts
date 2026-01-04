import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

export const idleSessionsService = {
  async getStats(userId: string): Promise<IdleStats> {
    const response = await axios.get<IdleStats>(
      `${API_BASE_URL}/api/idle-sessions/stats`,
      {
        params: { userId },
      }
    );
    return response.data;
  },
};
