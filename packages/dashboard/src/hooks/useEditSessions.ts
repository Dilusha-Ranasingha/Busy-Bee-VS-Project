import { useState, useEffect } from 'react';
import { editSessionsService } from '../services/Metrics-Tracking/editSessions.service';
import type { EditSession } from '../services/Metrics-Tracking/editSessions.service';


export const useEditSessions = (userId: string | undefined) => {
  const [bestSession, setBestSession] = useState<EditSession | null>(null);
  const [top3Sessions, setTop3Sessions] = useState<EditSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBestSession(null);
      setTop3Sessions([]);
      return;
    }

    const fetchSessions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [best, top3] = await Promise.all([
          editSessionsService.getBestSession(userId),
          editSessionsService.getTop3Sessions(userId),
        ]);

        setBestSession(best);
        setTop3Sessions(top3);
      } catch (err) {
        console.error('Error fetching edit sessions:', err);
        setError('Failed to load edit sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [userId]);

  return {
    bestSession,
    top3Sessions,
    isLoading,
    error,
  };
};
