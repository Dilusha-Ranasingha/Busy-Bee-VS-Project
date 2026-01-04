import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface FocusStreak {
  id: string;
  userId: string;
  workspaceId?: string;
  sessionId: string;
  type: 'global' | 'per_file';
  fileHash?: string;
  language?: string;
  startTs: string;
  endTs: string;
  durationMin: number;
  createdAt: string;
}

export const focusStreakService = {
  async getBestGlobalStreak(userId: string): Promise<FocusStreak | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/focus-streaks/best/global`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best global streak:', error);
      throw error;
    }
  },

  async getBestPerFileStreaks(userId: string, limit: number = 10): Promise<FocusStreak[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/focus-streaks/best/per-file`, {
        params: { userId, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best per-file streaks:', error);
      throw error;
    }
  },

  async getBestStreaks(
    userId: string,
    options?: {
      type?: 'global' | 'per_file';
      language?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<FocusStreak[]> {
    try {
      const params: any = { userId };
      
      if (options?.type) params.type = options.type;
      if (options?.language) params.language = options.language;
      if (options?.limit) params.limit = options.limit;
      if (options?.startDate) params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/api/focus-streaks/best`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best streaks:', error);
      throw error;
    }
  },
};
