import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useTaskRuns } from '../../../hooks/useTaskRuns';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { CheckCircle2, Play, Hammer, TestTube, Clock } from 'lucide-react';

export default function TaskRunsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [excludeWatchLike, setExcludeWatchLike] = useState(true);
  const { stats, loading, error } = useTaskRuns(user?.id, excludeWatchLike);

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
        <p className="text-gray-500">No task run data available</p>
      </div>
    );
  }

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatPassRate = (rate: number): string => {
    return `${Math.round(rate * 100)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Task Runs (Builds & Tests)</h1>

        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeWatchLike}
              onChange={(e) => setExcludeWatchLike(e.target.checked)}
              className="rounded"
            />
            Exclude watch/dev tasks
          </label>
        </div>
      </div>

      {/* Test Stats */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <TestTube className="w-6 h-6 text-purple-500" />
          Tests
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Test Runs */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Runs</p>
                <p className="text-3xl font-bold mt-2">{stats.test.totalRuns}</p>
              </div>
              <Play className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </Card>

          {/* Test Passes */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passes</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {stats.test.passes}
                </p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </Card>

          {/* Test Pass Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-3xl font-bold mt-2">
                  {formatPassRate(stats.test.passRate)}
                </p>
              </div>
              <div className="w-12 h-12 flex items-center justify-center">
                <div
                  className="text-4xl"
                  style={{
                    color:
                      stats.test.passRate >= 0.8
                        ? '#22c55e'
                        : stats.test.passRate >= 0.5
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {stats.test.passRate >= 0.8 ? '🎯' : stats.test.passRate >= 0.5 ? '⚠️' : '❌'}
                </div>
              </div>
            </div>
          </Card>

          {/* Avg Test Duration */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-3xl font-bold mt-2">
                  {formatDuration(stats.test.avgDurationSec)}
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </Card>
        </div>
      </div>

      {/* Build Stats */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Hammer className="w-6 h-6 text-orange-500" />
          Builds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Build Runs */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Runs</p>
                <p className="text-3xl font-bold mt-2">{stats.build.totalRuns}</p>
              </div>
              <Play className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </Card>

          {/* Build Passes */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passes</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {stats.build.passes}
                </p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </Card>

          {/* Build Pass Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-3xl font-bold mt-2">
                  {formatPassRate(stats.build.passRate)}
                </p>
              </div>
              <div className="w-12 h-12 flex items-center justify-center">
                <div
                  className="text-4xl"
                  style={{
                    color:
                      stats.build.passRate >= 0.8
                        ? '#22c55e'
                        : stats.build.passRate >= 0.5
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {stats.build.passRate >= 0.8 ? '🎯' : stats.build.passRate >= 0.5 ? '⚠️' : '❌'}
                </div>
              </div>
            </div>
          </Card>

          {/* Avg Build Duration */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-3xl font-bold mt-2">
                  {formatDuration(stats.build.avgDurationSec)}
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Task Labels */}
      {stats.recentLabels.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Recent Task Labels</h3>
          <div className="flex flex-wrap gap-2">
            {stats.recentLabels.map((label, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm font-mono text-gray-700"
              >
                {label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 text-blue-900">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Automatically detects and tracks all build and test tasks</li>
          <li>Pass = exit code 0, Fail = non-zero exit code</li>
          <li>Watch/dev tasks (like jest --watch, vite dev) are marked separately</li>
          <li>
            Test detection: keywords like test, jest, vitest, mocha, pytest
          </li>
          <li>
            Build detection: keywords like build, compile, tsc, webpack, make
          </li>
        </ul>
      </Card>
    </div>
  );
}
