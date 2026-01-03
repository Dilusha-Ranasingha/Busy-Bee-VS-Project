import { useState, useEffect } from 'react';
import { errorFixTimeService, type ErrorFixStats } from '../services/errorFixTime.service';

export function useErrorFixTime(userId: string | undefined, severity?: 'error' | 'warning') {
  const [stats, setStats] = useState<ErrorFixStats | null>(null);
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
        const data = await errorFixTimeService.getStats(userId, severity);
        
        if (mounted) {
          setStats(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch error fix time stats'));
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
  }, [userId, severity]);

  return { stats, loading, error };
}
