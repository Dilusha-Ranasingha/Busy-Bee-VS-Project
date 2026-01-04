import { useState, useEffect } from 'react';
import { taskRunsService, type TaskRunStats } from '../services/Metrics-Tracking/taskRuns.service';

export function useTaskRuns(
  userId: string | undefined,
  excludeWatchLike: boolean = true,
  since?: string
) {
  const [stats, setStats] = useState<TaskRunStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await taskRunsService.getStats(userId, excludeWatchLike, since);

        if (mounted) {
          setStats(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch task run stats'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, [userId, excludeWatchLike, since]);

  return { stats, loading, error };
}
