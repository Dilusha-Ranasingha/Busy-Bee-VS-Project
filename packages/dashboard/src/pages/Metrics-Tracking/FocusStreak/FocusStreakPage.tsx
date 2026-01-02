import { useFocusStreaks } from '../../../hooks/useFocusStreaks';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const FocusStreakPage = () => {
  const { user } = useAuth();
  const { bestGlobalStreak, bestPerFileStreaks, isLoading, error } = useFocusStreaks(user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Focus Streaks</h1>
        <p className="text-gray-600">
          Track your longest continuous coding sessions
        </p>
      </div>

      {/* Best Global Streak */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🏆 Best Global Streak
        </h2>
        
        {bestGlobalStreak ? (
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  {formatDuration(bestGlobalStreak.durationMin)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateTime(bestGlobalStreak.startTs)} → {formatDateTime(bestGlobalStreak.endTs)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Session: {bestGlobalStreak.sessionId.substring(0, 12)}...
                </div>
              </div>
              <div className="text-6xl">🔥</div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p>No global streaks yet. Start coding to build your first streak!</p>
          </Card>
        )}
      </section>

      {/* Best Per-File Streaks */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📁 Best Per-File Streaks
        </h2>
        
        {bestPerFileStreaks.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Period
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bestPerFileStreaks.map((streak, index) => (
                  <tr key={streak.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                        {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                        {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                        <span className="text-sm font-medium text-gray-900">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {streak.language || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatDuration(streak.durationMin)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(streak.startTs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No per-file streaks yet. Start focusing on a file to build streaks!</p>
          </Card>
        )}
      </section>

      {/* How it Works */}
      <section className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          How Focus Streaks Work
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Global Streak:</strong> Continuous coding activity across all files. 
            Breaks after 10 minutes of inactivity.
          </p>
          <p>
            <strong>Per-File Streak:</strong> Continuous focus on a single file. 
            Tolerates micro-switches up to 30 seconds.
          </p>
          <p className="text-xs text-gray-500 mt-4">
            💡 Tip: File paths are hashed for privacy. Only language and duration are tracked.
          </p>
        </div>
      </section>
    </div>
  );
};
