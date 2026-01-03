import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useErrorFixTime } from '../../../hooks/useErrorFixTime';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export function ErrorFixTimePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [severity, setSeverity] = useState<'error' | 'warning' | undefined>(undefined);
  const { stats, loading, error } = useErrorFixTime(user?.id, severity);

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
        <p className="text-gray-500">No error fix time data available</p>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Error Fix Time</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setSeverity(undefined)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severity === undefined
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSeverity('error')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severity === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Errors Only
          </button>
          <button
            onClick={() => setSeverity('warning')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              severity === 'warning'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Warnings Only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Count */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Fixed</p>
              <p className="text-3xl font-bold mt-2">{stats.totalCount}</p>
            </div>
            <Activity className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        {/* Average Fix Time */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Fix Time</p>
              <p className="text-3xl font-bold mt-2">
                {stats.average ? formatDuration(Math.round(stats.average)) : 'N/A'}
              </p>
            </div>
            <Clock className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </Card>

        {/* Fastest Fix */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fastest Fix</p>
              <p className="text-3xl font-bold mt-2">
                {stats.shortest ? formatDuration(stats.shortest.durationSec) : 'N/A'}
              </p>
            </div>
            <TrendingDown className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>

        {/* Slowest Fix */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Slowest Fix</p>
              <p className="text-3xl font-bold mt-2">
                {stats.longest ? formatDuration(stats.longest.durationSec) : 'N/A'}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Longest Fix Details */}
        {stats.longest && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Longest Fix Session
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(stats.longest.durationSec)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Language</p>
                <p className="font-mono">{stats.longest.language || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Started</p>
                <p className="text-sm">{formatTimestamp(stats.longest.startTs)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fixed</p>
                <p className="text-sm">{formatTimestamp(stats.longest.endTs)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Error Key</p>
                <p className="text-xs font-mono text-gray-500 break-all">
                  {stats.longest.errorKey}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Shortest Fix Details */}
        {stats.shortest && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              Shortest Fix Session
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(stats.shortest.durationSec)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Language</p>
                <p className="font-mono">{stats.shortest.language || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Started</p>
                <p className="text-sm">{formatTimestamp(stats.shortest.startTs)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fixed</p>
                <p className="text-sm">{formatTimestamp(stats.shortest.endTs)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Error Key</p>
                <p className="text-xs font-mono text-gray-500 break-all">
                  {stats.shortest.errorKey}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 text-blue-900">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Tracks individual errors from appearance to resolution</li>
          <li>Minimum duration: 60 seconds (1 minute)</li>
          <li>Ignores flickering errors (appearing/disappearing within 2 seconds)</li>
          <li>Joins sessions if error reappears within 5 seconds</li>
          <li>Each error is identified by file hash, error code, and line number</li>
        </ul>
      </Card>
    </div>
  );
}
