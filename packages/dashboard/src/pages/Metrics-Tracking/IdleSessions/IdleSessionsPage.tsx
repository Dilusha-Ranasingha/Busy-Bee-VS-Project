import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useIdleSessions } from '../../../hooks/useIdleSessions';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';
import { Coffee, TrendingUp, TrendingDown, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function IdleSessionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { stats, loading, error } = useIdleSessions(user?.id);

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
        <Coffee className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
        <p className="text-sm text-vscode-descriptionForeground">No idle session data available</p>
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
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
        <div className="flex items-start gap-2">
          <Coffee className="text-brand-primary flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-vscode-foreground">
            <p className="font-semibold mb-1">Tracking idle periods ≥15 minutes</p>
            <p className="opacity-75">Idle time starts when there's no VS Code activity for 15+ minutes. It ends when you resume any activity.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3">
        {/* Longest Idle */}
        <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-orange-500" size={20} strokeWidth={2} />
            <h2 className="text-base font-semibold text-vscode-editor-fg">Longest Idle Session</h2>
          </div>
          {stats.longest ? (
            <div className="space-y-3">
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Duration</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(stats.longest.durationMin)}
                </p>
              </div>
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Time Range</p>
                <p className="text-sm text-vscode-editor-fg">
                  {formatTimeRange(stats.longest.startTs, stats.longest.endTs)}
                </p>
              </div>
              {stats.longest.endedReason && (
                <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                  <p className="text-xs text-vscode-foreground opacity-75 mb-1">Ended By</p>
                  <p className="text-xs font-mono text-vscode-descriptionForeground">
                    {stats.longest.endedReason.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2 p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
                <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-vscode-foreground">Longer idle times may indicate distractions</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-vscode-descriptionForeground text-center py-4">No idle sessions recorded yet</p>
          )}
        </div>

        {/* Shortest Idle */}
        <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="text-green-500" size={20} strokeWidth={2} />
            <h2 className="text-base font-semibold text-vscode-editor-fg">Shortest Idle Session</h2>
          </div>
          {stats.shortest ? (
            <div className="space-y-3">
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Duration</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(stats.shortest.durationMin)}
                </p>
              </div>
              <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                <p className="text-xs text-vscode-foreground opacity-75 mb-1">Time Range</p>
                <p className="text-sm text-vscode-editor-fg">
                  {formatTimeRange(stats.shortest.startTs, stats.shortest.endTs)}
                </p>
              </div>
              {stats.shortest.endedReason && (
                <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
                  <p className="text-xs text-vscode-foreground opacity-75 mb-1">Ended By</p>
                  <p className="text-xs font-mono text-vscode-descriptionForeground">
                    {stats.shortest.endedReason.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2 p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
                <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-vscode-foreground">Shorter idle sessions show better focus</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-vscode-descriptionForeground text-center py-4">No idle sessions recorded yet</p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">How idle tracking works</h3>
        </div>
        <div className="text-sm text-vscode-foreground space-y-3">
          <div>
            <p className="font-medium mb-2">Activity detection:</p>
            <ul className="space-y-1 ml-1">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Edits, saves, file navigation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Text selection, scrolling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Running tasks/tests, debugging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Terminal interactions, VS Code focus</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Idle session lifecycle:</p>
            <ul className="space-y-1 ml-1">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Starts: 15 minutes after last activity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Ends: When any activity resumes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary mt-0.5">•</span>
                <span>Saved: Only if duration ≥ 15 minutes</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
