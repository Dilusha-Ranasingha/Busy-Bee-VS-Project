import { useEffect, useState } from 'react';
import { idleSessionsService, type IdleStats } from '../services/Metrics-Tracking/idleSessions.service';

export function useIdleSessions(userId: string | undefined) {
  const [stats, setStats] = useState<IdleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await idleSessionsService.getStats(userId);
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch idle stats'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Poll every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  return { stats, loading, error };
}
