import { apiClient } from '../api.client';

export interface CommitEditBatch {
  editsPerCommit: number;
  timeToCommitMin: number;
  startTs: string;
  endTs: string;
  commitSha: string | null;
}

export interface CommitEditStats {
  highest: CommitEditBatch | null;
  lowest: CommitEditBatch | null;
  todayCount: number;
}

export const commitEditSessionsService = {
  async getStats(userId: string): Promise<CommitEditStats> {
    const params = new URLSearchParams({ userId });
    return apiClient.get<CommitEditStats>(`/api/commit-edit-sessions/stats?${params}`);
  },
};
