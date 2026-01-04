import { useState, useEffect } from 'react';
import { commitEditSessionsService, type CommitEditStats } from '../services/Metrics-Tracking/commitEditSessions.service';

export function useCommitEditSessions(userId: string | undefined) {
  const [stats, setStats] = useState<CommitEditStats | null>(null);
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
        const data = await commitEditSessionsService.getStats(userId);

        if (mounted) {
          setStats(data);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err : new Error('Failed to fetch commit-edit stats')
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    // Poll every 30 seconds to keep stats updated
    const interval = setInterval(fetchStats, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  return { stats, loading, error };
}
