import { apiClient } from '../api.client';

export interface ErrorFixStats {
  longest: {
    errorKey: string;
    fileHash: string;
    language: string | null;
    durationSec: number;
    startTs: string;
    endTs: string;
  } | null;
  shortest: {
    errorKey: string;
    fileHash: string;
    language: string | null;
    durationSec: number;
    startTs: string;
    endTs: string;
  } | null;
  average: number | null;
  totalCount: number;
}

export const errorFixTimeService = {
  async getStats(userId: string, severity?: 'error' | 'warning'): Promise<ErrorFixStats> {
    const params = new URLSearchParams({ userId });
    if (severity) {
      params.append('severity', severity);
    }
    
    return apiClient.get<ErrorFixStats>(`/api/error-fix-time/stats?${params}`);
  },
};
