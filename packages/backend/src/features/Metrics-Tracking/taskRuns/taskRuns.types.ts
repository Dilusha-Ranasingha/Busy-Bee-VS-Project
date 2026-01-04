export interface CreateTaskRunInput {
  userId: string;
  workspaceId?: string;
  label: string;
  kind: 'test' | 'build';
  startTs: string;
  endTs: string;
  durationSec: number;
  result: 'pass' | 'fail' | 'cancelled';
  pid?: number;
  isWatchLike?: boolean;
}

export interface TaskRun {
  id: string;
  userId: string;
  workspaceId: string | null;
  label: string;
  kind: 'test' | 'build';
  startTs: string;
  endTs: string;
  durationSec: number;
  result: 'pass' | 'fail' | 'cancelled';
  pid: number | null;
  isWatchLike: boolean;
  createdAt: string;
}

export interface TaskRunStats {
  test: {
    totalRuns: number;
    passes: number;
    passRate: number;
    avgDurationSec: number | null;
  };
  build: {
    totalRuns: number;
    passes: number;
    passRate: number;
    avgDurationSec: number | null;
  };
  recentLabels: string[];
}
