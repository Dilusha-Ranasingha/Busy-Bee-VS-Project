import { useState, useEffect } from 'react';
import { diagnosticDensityService } from '../services/Metrics-Tracking/diagnosticDensity.service';
import type { DiagnosticDensityBestSessions } from '../services/Metrics-Tracking/diagnosticDensity.service';

export function useDiagnosticDensity(userId: string | null) {
  const [bestSessions, setBestSessions] = useState<DiagnosticDensityBestSessions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setBestSessions(null);
      return;
    }

    const fetchBestSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await diagnosticDensityService.getBestSessions(userId);
        setBestSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBestSessions();
  }, [userId]);

  return {
    bestSessions,
    isLoading,
    error,
  };
}
