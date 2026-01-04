import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useCommitEditSessions } from '../../../hooks/useCommitEditSessions';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { TrendingUp, TrendingDown, GitCommit, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CommitEditSessionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { stats, loading, error } = useCommitEditSessions(user?.id);

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
        <GitCommit className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
        <p className="text-sm text-vscode-descriptionForeground">No commit-edit data available</p>
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
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Commits */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Commits Today</p>
            <GitCommit className="text-brand-primary opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">{stats.todayCount}</p>
        </div>

        {/* Highest Batch */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Highest Edits</p>
            <TrendingUp className="text-orange-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">
            {stats.highest ? stats.highest.editsPerCommit : 'N/A'}
          </p>
        </div>

        {/* Lowest Batch */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Lowest Edits/Commit</p>
            <TrendingDown className="text-green-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">
            {stats.lowest ? stats.lowest.editsPerCommit : 'N/A'}
          </p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-3">
        {/* Highest Batch Details */}
        {stats.highest && (
          <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-orange-500" size={20} strokeWidth={2} />
              <h2 className="text-base font-semibold text-vscode-editor-fg">Largest Batch</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Edits/Commit</p>
                <p className="text-xl font-bold text-orange-600">
                  {stats.highest.editsPerCommit}
                </p>
              </div>
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Time to Commit</p>
                <p className="text-sm font-mono text-vscode-editor-fg">{formatDuration(stats.highest.timeToCommitMin)}</p>
              </div>
              <div className="col-span-2 border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Time Range</p>
                <p className="text-sm font-mono text-vscode-editor-fg">
                  {formatTimeRange(stats.highest.startTs, stats.highest.endTs)}
                </p>
              </div>
              {stats.highest.commitSha && (
                <div className="col-span-2 border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                  <p className="text-xs text-vscode-foreground opacity-75 mb-1">Commit SHA</p>
                  <p className="text-xs font-mono text-vscode-descriptionForeground">
                    {stats.highest.commitSha.substring(0, 7)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 mt-3 p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
              <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-vscode-foreground">Larger batches = less frequent commits (riskier)</p>
            </div>
          </div>
        )}

        {/* Lowest Batch Details */}
        {stats.lowest && (
          <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="text-green-500" size={20} strokeWidth={2} />
              <h2 className="text-base font-semibold text-vscode-editor-fg">Smallest Batch</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Edits/Commit</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.lowest.editsPerCommit}
                </p>
              </div>
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Time to Commit</p>
                <p className="text-sm font-mono text-vscode-editor-fg">{formatDuration(stats.lowest.timeToCommitMin)}</p>
              </div>
              <div className="col-span-2 border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Time Range</p>
                <p className="text-sm font-mono text-vscode-editor-fg">
                  {formatTimeRange(stats.lowest.startTs, stats.lowest.endTs)}
                </p>
              </div>
              {stats.lowest.commitSha && (
                <div className="col-span-2 border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                  <p className="text-xs text-vscode-foreground opacity-75 mb-1">Commit SHA</p>
                  <p className="text-xs font-mono text-vscode-descriptionForeground">
                    {stats.lowest.commitSha.substring(0, 7)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 mt-3 p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-vscode-foreground">Smaller batches = frequent commits (safer checkpoints)</p>
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
            <span>Tracks how many edits you make between commits</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Session starts: first edit after the last commit</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Session ends: when you commit (any file)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Edits per commit = total edit operations in the session</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Smaller batches = more frequent commits (safer development)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span>Larger batches = less frequent commits (higher risk)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
