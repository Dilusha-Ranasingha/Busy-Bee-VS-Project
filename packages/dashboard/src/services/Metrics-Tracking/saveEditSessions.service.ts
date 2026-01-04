import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface SaveEditSession {
  id: string;
  userId: string;
  sessionId: string;
  workspaceId?: string;
  startTs: string;
  endTs: string;
  durationMin: number;
  editsTotal: number;
  savesManual: number;
  savesAutosaveDelay: number;
  savesAutosaveFocusout: number;
  autosavesEffective: number;
  checkpointAutosaveCount: number;
  saveToEditRatioManual: number;
  saveToEditRatioAutosave: number;
  effectiveSaveToEditRatio: number;
  avgSecsBetweenSaves?: number;
  medianSecsBetweenSaves?: number;
  manualSaveShare?: number;
  collapseWindowSec: number;
  createdAt: string;
}

export const saveEditSessionsService = {
  async getBestSession(userId: string): Promise<SaveEditSession | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/save-edit-sessions/best/single`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best save-edit session:', error);
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
  ): Promise<SaveEditSession[]> {
    try {
      const params: any = { userId };
      
      if (options?.limit) params.limit = options.limit;
      if (options?.startDate) params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/api/save-edit-sessions/best`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best save-edit sessions:', error);
      throw error;
    }
  },
};
