import { useState, useEffect } from 'react';
import { diagnosticDensityService } from '../services/Metrics-Tracking/diagnosticDensity.service';
import type { DiagnosticDensityExtremes } from '../services/Metrics-Tracking/diagnosticDensity.service';

export function useDiagnosticDensity(userId: string | null) {
  const [extremes, setExtremes] = useState<DiagnosticDensityExtremes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setExtremes(null);
      return;
    }

    const fetchExtremes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await diagnosticDensityService.getExtremes(userId);
        setExtremes(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch extremes'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchExtremes();
  }, [userId]);

  return {
    extremes,
    isLoading,
    error,
  };
}
