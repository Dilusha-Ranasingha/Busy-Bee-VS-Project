import { apiClient } from '../api.client';

export interface TaskKindStats {
  totalRuns: number;
  passes: number;
  passRate: number;
  avgDurationSec: number | null;
}

export interface TaskRunStats {
  test: TaskKindStats;
  build: TaskKindStats;
  recentLabels: string[];
}

export const taskRunsService = {
  async getStats(
    userId: string,
    excludeWatchLike: boolean = true,
    since?: string
  ): Promise<TaskRunStats> {
    const params = new URLSearchParams({ userId });
    if (excludeWatchLike !== undefined) {
      params.append('excludeWatchLike', String(excludeWatchLike));
    }
    if (since) {
      params.append('since', since);
    }

    return apiClient.get<TaskRunStats>(`/api/task-runs/stats?${params}`);
  },
};
