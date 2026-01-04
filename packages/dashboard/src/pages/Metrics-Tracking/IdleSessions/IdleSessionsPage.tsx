import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useIdleSessions } from '../../../hooks/useIdleSessions';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { Coffee, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function IdleSessionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { stats, loading, error } = useIdleSessions(user?.id);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">Error loading stats: {error.message}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">No idle session data available</p>
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTimeRange = (startTs: string, endTs: string): string => {
    const startDate = formatDate(startTs);
    const endDate = formatDate(endTs);
    const sameDay = startDate === endDate;
    
    if (sameDay) {
      return `${startDate} • ${formatTime(startTs)}–${formatTime(endTs)}`;
    }
    return `${startDate} ${formatTime(startTs)} – ${endDate} ${formatTime(endTs)}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Idle Time (Distraction Detection)</h1>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Coffee className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Tracking idle periods ≥15 minutes</p>
            <p>Idle time starts when there's no VS Code activity (edits, navigation, tasks, debug, etc.) for 15+ minutes. It ends when you resume any activity.</p>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Longest Idle */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Longest Idle Session
            </h2>
          </div>
          {stats.longest ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatDuration(stats.longest.durationMin)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time range</p>
                <p className="text-sm">
                  {formatTimeRange(stats.longest.startTs, stats.longest.endTs)}
                </p>
              </div>
              {stats.longest.endedReason && (
                <div>
                  <p className="text-sm text-gray-600">Ended by</p>
                  <p className="text-xs font-mono text-gray-500">
                    {stats.longest.endedReason.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  ⚠️ Longer idle times may indicate distractions
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No idle sessions recorded yet</p>
          )}
        </Card>

        {/* Shortest Idle */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              Shortest Idle Session
            </h2>
          </div>
          {stats.shortest ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatDuration(stats.shortest.durationMin)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time range</p>
                <p className="text-sm">
                  {formatTimeRange(stats.shortest.startTs, stats.shortest.endTs)}
                </p>
              </div>
              {stats.shortest.endedReason && (
                <div>
                  <p className="text-sm text-gray-600">Ended by</p>
                  <p className="text-xs font-mono text-gray-500">
                    {stats.shortest.endedReason.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  ✅ Shorter idle sessions show better focus
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No idle sessions recorded yet</p>
          )}
        </Card>
      </div>

      {/* How it works */}
      <Card className="p-6 bg-gray-50 border-gray-200">
        <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          How idle tracking works
        </h3>
        <div className="text-sm text-gray-700 space-y-2">
          <div>
            <span className="font-medium">Activity detection:</span>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
              <li>Edits, saves, file navigation</li>
              <li>Text selection, scrolling</li>
              <li>Running tasks/tests, debugging</li>
              <li>Terminal interactions, VS Code focus</li>
            </ul>
          </div>
          <div className="pt-2">
            <span className="font-medium">Idle session lifecycle:</span>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
              <li>Starts: 15 minutes after last activity</li>
              <li>Ends: When any activity resumes</li>
              <li>Saved: Only if duration ≥ 15 minutes</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
