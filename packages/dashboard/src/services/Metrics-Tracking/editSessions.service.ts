import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface EditSession {
  id: string;
  userId: string;
  sessionId: string;
  workspaceId?: string;
  startTs: string;
  endTs: string;
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
  createdAt: string;
}

export const editSessionsService = {
  async getBestSession(userId: string): Promise<EditSession | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/edit-sessions/best/single`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best edit session:', error);
      throw error;
    }
  },

  async getTop3Sessions(userId: string): Promise<EditSession[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/edit-sessions/best/top3`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch top 3 edit sessions:', error);
      throw error;
    }
  },

  async getBestSessions(
    userId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<EditSession[]> {
    try {
      const params: any = { userId };
      
      if (options?.limit) params.limit = options.limit;
      if (options?.startDate) params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/api/edit-sessions/best`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best edit sessions:', error);
      throw error;
    }
  },
};
