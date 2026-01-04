import { useState } from 'react';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useTaskRuns } from '../../../hooks/useTaskRuns';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { CheckCircle2, Play, Hammer, TestTube, Clock, Info, XCircle, AlertTriangle } from 'lucide-react';

export default function TaskRunsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [excludeWatchLike, setExcludeWatchLike] = useState(true);
  const { stats, loading, error } = useTaskRuns(user?.id, excludeWatchLike);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg border border-vscode-input-error-border bg-vscode-input-error-bg text-vscode-input-error-fg text-sm">
        Error loading stats: {error.message}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg text-center">
        <Play className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
        <p className="text-sm text-vscode-descriptionForeground">No task run data available</p>
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

  const getPassRateIcon = (rate: number) => {
    if (rate >= 0.8) {
      return <CheckCircle2 className="text-green-500" size={20} />;
    } else if (rate >= 0.5) {
      return <AlertTriangle className="text-yellow-500" size={20} />;
    } else {
      return <XCircle className="text-red-500" size={20} />;
    }
  };

  const getPassRateColor = (rate: number): string => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-2 p-3 border border-vscode-panel-border rounded-lg bg-vscode-widget-bg">
        <input
          type="checkbox"
          checked={excludeWatchLike}
          onChange={(e) => setExcludeWatchLike(e.target.checked)}
          className="rounded"
          id="exclude-watch"
        />
        <label htmlFor="exclude-watch" className="text-sm text-vscode-foreground cursor-pointer">
          Exclude watch/dev tasks
        </label>
      </div>

      {/* Test Stats */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <TestTube className="text-purple-500" size={20} strokeWidth={2} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">Tests</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Total Test Runs */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Total Runs</p>
              <Play className="text-purple-500 opacity-30" size={16} />
            </div>
            <p className="text-2xl font-bold text-vscode-editor-fg">{stats.test.totalRuns}</p>
          </div>

          {/* Test Passes */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Passes</p>
              <CheckCircle2 className="text-green-500 opacity-30" size={16} />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.test.passes}</p>
          </div>

          {/* Test Pass Rate */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Pass Rate</p>
              {getPassRateIcon(stats.test.passRate)}
            </div>
            <p className={`text-2xl font-bold ${getPassRateColor(stats.test.passRate)}`}>
              {formatPassRate(stats.test.passRate)}
            </p>
          </div>

          {/* Avg Test Duration */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Avg Duration</p>
              <Clock className="text-brand-primary opacity-30" size={16} />
            </div>
            <p className="text-2xl font-bold text-vscode-editor-fg">
              {formatDuration(stats.test.avgDurationSec)}
            </p>
          </div>
        </div>
      </div>

      {/* Build Stats */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Hammer className="text-orange-500" size={20} strokeWidth={2} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">Builds</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Total Build Runs */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Total Runs</p>
              <Play className="text-orange-500 opacity-30" size={16} />
            </div>
            <p className="text-2xl font-bold text-vscode-editor-fg">{stats.build.totalRuns}</p>
          </div>

          {/* Build Passes */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Passes</p>
              <CheckCircle2 className="text-green-500 opacity-30" size={16} />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.build.passes}</p>
          </div>

          {/* Build Pass Rate */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Pass Rate</p>
              {getPassRateIcon(stats.build.passRate)}
            </div>
            <p className={`text-2xl font-bold ${getPassRateColor(stats.build.passRate)}`}>
              {formatPassRate(stats.build.passRate)}
            </p>
          </div>

          {/* Avg Build Duration */}
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-foreground opacity-75">Avg Duration</p>
              <Clock className="text-brand-primary opacity-30" size={16} />
            </div>
            <p className="text-2xl font-bold text-vscode-editor-fg">
              {formatDuration(stats.build.avgDurationSec)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Task Labels */}
      {stats.recentLabels.length > 0 && (
        <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
          <h3 className="text-sm font-semibold mb-3 text-vscode-editor-fg">Recent Task Labels</h3>
          <div className="flex flex-wrap gap-2">
            {stats.recentLabels.map((label, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-vscode-input-bg border border-vscode-input-border rounded text-xs font-mono text-vscode-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">How it works</h3>
        </div>
        <ul className="text-sm text-vscode-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Automatically detects and tracks all build and test tasks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Pass = exit code 0, Fail = non-zero exit code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Watch/dev tasks (like jest --watch, vite dev) are marked separately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Test detection: keywords like test, jest, vitest, mocha, pytest</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Build detection: keywords like build, compile, tsc, webpack, make</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
