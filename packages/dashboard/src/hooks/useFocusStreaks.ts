import { useState, useEffect } from 'react';
import { focusStreakService } from '../services/Metrics-Tracking/focusStreak.service';
import type { FocusStreak } from '../services/Metrics-Tracking/focusStreak.service';


export const useFocusStreaks = (userId: string | undefined) => {
  const [bestGlobalStreak, setBestGlobalStreak] = useState<FocusStreak | null>(null);
  const [bestPerFileStreaks, setBestPerFileStreaks] = useState<FocusStreak[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBestGlobalStreak(null);
      setBestPerFileStreaks([]);
      return;
    }

    const fetchStreaks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [globalStreak, perFileStreaks] = await Promise.all([
          focusStreakService.getBestGlobalStreak(userId),
          focusStreakService.getBestPerFileStreaks(userId, 10),
        ]);

        setBestGlobalStreak(globalStreak);
        setBestPerFileStreaks(perFileStreaks);
      } catch (err) {
        console.error('Error fetching focus streaks:', err);
        setError('Failed to load focus streaks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreaks();
  }, [userId]);

  return {
    bestGlobalStreak,
    bestPerFileStreaks,
    isLoading,
    error,
  };
};
