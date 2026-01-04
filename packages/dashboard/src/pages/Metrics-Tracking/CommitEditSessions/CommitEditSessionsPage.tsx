import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useCommitEditSessions } from '../../../hooks/useCommitEditSessions';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { TrendingUp, TrendingDown, GitCommit, Edit3 } from 'lucide-react';

export default function CommitEditSessionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { stats, loading, error } = useCommitEditSessions(user?.id);

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
        <p className="text-gray-500">No commit-edit data available</p>
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeRange = (startTs: string, endTs: string): string => {
    return `${formatTime(startTs)}–${formatTime(endTs)}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Commit-per-Edit (Edits before Commit)</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Commits */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commits Today</p>
              <p className="text-3xl font-bold mt-2">{stats.todayCount}</p>
            </div>
            <GitCommit className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        {/* Highest Batch */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Highest Edits/Commit</p>
              <p className="text-3xl font-bold mt-2">
                {stats.highest ? stats.highest.editsPerCommit : 'N/A'}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </Card>

        {/* Lowest Batch */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lowest Edits/Commit</p>
              <p className="text-3xl font-bold mt-2">
                {stats.lowest ? stats.lowest.editsPerCommit : 'N/A'}
              </p>
            </div>
            <TrendingDown className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest Batch Details */}
        {stats.highest && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Largest Batch (Highest Edits)
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Edits before commit</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.highest.editsPerCommit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time to commit</p>
                <p className="font-mono">{formatDuration(stats.highest.timeToCommitMin)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time range</p>
                <p className="text-sm">
                  {formatTimeRange(stats.highest.startTs, stats.highest.endTs)}
                </p>
              </div>
              {stats.highest.commitSha && (
                <div>
                  <p className="text-sm text-gray-600">Commit</p>
                  <p className="text-xs font-mono text-gray-500">
                    {stats.highest.commitSha.substring(0, 7)}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  💡 Larger batches = less frequent commits (riskier)
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Lowest Batch Details */}
        {stats.lowest && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              Smallest Batch (Lowest Edits)
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Edits before commit</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.lowest.editsPerCommit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time to commit</p>
                <p className="font-mono">{formatDuration(stats.lowest.timeToCommitMin)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time range</p>
                <p className="text-sm">
                  {formatTimeRange(stats.lowest.startTs, stats.lowest.endTs)}
                </p>
              </div>
              {stats.lowest.commitSha && (
                <div>
                  <p className="text-sm text-gray-600">Commit</p>
                  <p className="text-xs font-mono text-gray-500">
                    {stats.lowest.commitSha.substring(0, 7)}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  ✅ Smaller batches = frequent commits (safer checkpoints)
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 text-blue-900 flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          How it works
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Tracks how many edits you make between commits</li>
          <li>Session starts: first edit after the last commit</li>
          <li>Session ends: when you commit (any file)</li>
          <li>Edits per commit = total edit operations in the session</li>
          <li>Smaller batches = more frequent commits (safer development)</li>
          <li>Larger batches = less frequent commits (higher risk)</li>
        </ul>
      </Card>
    </div>
  );
}
