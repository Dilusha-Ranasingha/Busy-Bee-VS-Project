import { useState, useEffect } from 'react';
import { saveEditSessionsService } from '../services/Metrics-Tracking/saveEditSessions.service';
import type { SaveEditSession } from '../services/Metrics-Tracking/saveEditSessions.service';

export function useSaveEditSessions(userId: string | null) {
  const [bestSession, setBestSession] = useState<SaveEditSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setBestSession(null);
      return;
    }

    const fetchBestSession = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await saveEditSessionsService.getBestSession(userId);
        setBestSession(session);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch best session'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBestSession();
  }, [userId]);

  return {
    bestSession,
    isLoading,
    error,
  };
}
