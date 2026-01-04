import { useState } from 'react';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useErrorFixTime } from '../../../hooks/useErrorFixTime';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { Clock, TrendingUp, TrendingDown, Activity, Info, Timer } from 'lucide-react';

export function ErrorFixTimePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [severity, setSeverity] = useState<'error' | 'warning' | undefined>(undefined);
  const { stats, loading, error } = useErrorFixTime(user?.id, severity);

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
        <Timer className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
        <p className="text-sm text-vscode-descriptionForeground">No error fix time data available</p>
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
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 p-3 border border-vscode-panel-border rounded-lg bg-vscode-widget-bg">
        <button
          onClick={() => setSeverity(undefined)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            severity === undefined
              ? 'bg-brand-primary text-white'
              : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg border border-vscode-input-border'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSeverity('error')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            severity === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg border border-vscode-input-border'
          }`}
        >
          Errors Only
        </button>
        <button
          onClick={() => setSeverity('warning')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            severity === 'warning'
              ? 'bg-yellow-500 text-white'
              : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg border border-vscode-input-border'
          }`}
        >
          Warnings Only
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Count */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Total Fixed</p>
            <Activity className="text-brand-primary opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">{stats.totalCount}</p>
        </div>

        {/* Average Fix Time */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Average Time</p>
            <Clock className="text-purple-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">
            {stats.average ? formatDuration(Math.round(stats.average)) : 'N/A'}
          </p>
        </div>

        {/* Fastest Fix */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Fastest Fix</p>
            <TrendingDown className="text-green-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">
            {stats.shortest ? formatDuration(stats.shortest.durationSec) : 'N/A'}
          </p>
        </div>

        {/* Slowest Fix */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Slowest Fix</p>
            <TrendingUp className="text-orange-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">
            {stats.longest ? formatDuration(stats.longest.durationSec) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-4">
        {/* Longest Fix Details */}
        {stats.longest && (
          <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-orange-500" size={20} strokeWidth={2} />
              <h2 className="text-base font-semibold text-vscode-editor-fg">Longest Fix Session</h2>
            </div>
            <div className="bg-vscode-editor-bg border border-vscode-panel-border rounded-lg p-3 space-y-3">
              <div>
                <p className="text-xs text-vscode-foreground opacity-75">Duration</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatDuration(stats.longest.durationSec)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-vscode-foreground opacity-75">Language</p>
                  <p className="text-sm font-mono text-vscode-editor-fg">{stats.longest.language || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-vscode-foreground opacity-75">Started</p>
                  <p className="text-xs text-vscode-foreground">{formatTimestamp(stats.longest.startTs)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-vscode-foreground opacity-75">Fixed</p>
                <p className="text-xs text-vscode-foreground">{formatTimestamp(stats.longest.endTs)}</p>
              </div>
              <div>
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Error Key</p>
                <p className="text-[10px] font-mono text-vscode-descriptionForeground break-all">
                  {stats.longest.errorKey}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shortest Fix Details */}
        {stats.shortest && (
          <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="text-green-500" size={20} strokeWidth={2} />
              <h2 className="text-base font-semibold text-vscode-editor-fg">Shortest Fix Session</h2>
            </div>
            <div className="bg-vscode-editor-bg border border-vscode-panel-border rounded-lg p-3 space-y-3">
              <div>
                <p className="text-xs text-vscode-foreground opacity-75">Duration</p>
                <p className="text-xl font-bold text-green-600">
                  {formatDuration(stats.shortest.durationSec)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-vscode-foreground opacity-75">Language</p>
                  <p className="text-sm font-mono text-vscode-editor-fg">{stats.shortest.language || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-vscode-foreground opacity-75">Started</p>
                  <p className="text-xs text-vscode-foreground">{formatTimestamp(stats.shortest.startTs)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-vscode-foreground opacity-75">Fixed</p>
                <p className="text-xs text-vscode-foreground">{formatTimestamp(stats.shortest.endTs)}</p>
              </div>
              <div>
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Error Key</p>
                <p className="text-[10px] font-mono text-vscode-descriptionForeground break-all">
                  {stats.shortest.errorKey}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">How it works</h3>
        </div>
        <ul className="text-sm text-vscode-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Tracks individual errors from appearance to resolution</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Minimum duration: 60 seconds (1 minute)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Ignores flickering errors (appearing/disappearing within 2 seconds)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Joins sessions if error reappears within 5 seconds</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Each error is identified by file hash, error code, and line number</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
