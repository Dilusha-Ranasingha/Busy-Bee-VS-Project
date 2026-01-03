import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface DiagnosticDensitySession {
  id: string;
  userId: string;
  sessionId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  startTs: string;
  endTs: string;
  durationMin: number;
  peakLineCount: number;
  peakErrors: number;
  peakWarnings: number;
  peakDensityPerKloc: number;
  finalLineCount: number;
  createdAt: string;
}

export interface DiagnosticDensityBestSessions {
  highest: DiagnosticDensitySession | null;
  lowest: DiagnosticDensitySession | null;
}

export const diagnosticDensityService = {
  async getBestSessions(userId: string): Promise<DiagnosticDensityBestSessions> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/diagnostic-density/best`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch best diagnostic density sessions:', error);
      throw error;
    }
  },
};
