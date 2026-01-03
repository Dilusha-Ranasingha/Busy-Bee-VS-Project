import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface DiagnosticDensityEvent {
  id: string;
  userId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  ts: string;
  lineCount: number;
  errors: number;
  warnings: number;
  densityPerKloc: number;
  createdAt: string;
}

export interface DiagnosticDensityExtremes {
  highest: DiagnosticDensityEvent | null;
  lowestNonZero: DiagnosticDensityEvent | null;
  latestZero: DiagnosticDensityEvent | null;
}

export const diagnosticDensityService = {
  async getExtremes(userId: string): Promise<DiagnosticDensityExtremes> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/diagnostic-density/extremes`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch diagnostic density extremes:', error);
      throw error;
    }
  },
};
