import { Trophy, Keyboard, BarChart3, Award, Medal, Info } from 'lucide-react';
import { useEditSessions } from '../../../hooks/useEditSessions';
import { useAuth } from '../../../contexts/AuthContext';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import type { EditSession } from '../../../services/Metrics-Tracking/editSessions.service';

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
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeRange = (start: string, end: string): string => {
  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
};

export const EditSessionsPage = () => {
  const { user } = useAuth();
  const { bestSession, top3Sessions, isLoading, error } = useEditSessions(user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg border border-vscode-input-error-border bg-vscode-input-error-bg text-vscode-input-error-fg text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Best Session */}
      <section className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="text-brand-primary" size={20} strokeWidth={2} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">
            Best Editing Cadence
          </h2>
        </div>
        
        {bestSession ? (
          <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg space-y-4">
            {/* Main Metric */}
            <div>
              <div className="text-xs text-vscode-foreground opacity-80 mb-1">Best Edits/Min</div>
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="text-brand-accent" size={20} />
                <div className="text-3xl font-bold text-brand-primary">
                  {bestSession.editsPerMin.toFixed(1)}
                </div>
              </div>
              <div className="text-xs text-vscode-foreground opacity-80">
                {formatTimeRange(bestSession.startTs, bestSession.endTs)}
              </div>
              <div className="text-[10px] text-vscode-descriptionForeground mt-1">
                Duration: {formatDuration(bestSession.durationMin)}
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-vscode-panel-border rounded px-2.5 py-2 bg-vscode-widget-bg">
                <div className="text-[10px] text-vscode-foreground opacity-75">Insert/min</div>
                <div className="text-lg font-semibold text-vscode-editor-fg">
                  {Math.round(bestSession.insertCharsPerMin)}
                </div>
              </div>
              <div className="border border-vscode-panel-border rounded px-2.5 py-2 bg-vscode-widget-bg">
                <div className="text-[10px] text-vscode-foreground opacity-75">Delete/min</div>
                <div className="text-lg font-semibold text-vscode-editor-fg">
                  {Math.round(bestSession.deleteCharsPerMin)}
                </div>
              </div>
              <div className="border border-vscode-panel-border rounded px-2.5 py-2 bg-vscode-widget-bg">
                <div className="text-[10px] text-vscode-foreground opacity-75">Add/Delete Ratio</div>
                <div className="text-lg font-semibold text-vscode-editor-fg">
                  {bestSession.addDeleteRatio.toFixed(2)}
                </div>
              </div>
              {bestSession.typingBurstinessIndex !== undefined && (
                <div className="border border-vscode-panel-border rounded px-2.5 py-2 bg-vscode-widget-bg">
                  <div className="text-[10px] text-vscode-foreground opacity-75">Burstiness</div>
                  <div className="text-lg font-semibold text-vscode-editor-fg">
                    {bestSession.typingBurstinessIndex.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Details */}
            <div className="pt-3 border-t border-vscode-panel-border">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-vscode-foreground">
                  <span className="opacity-75">Total Edits:</span>
                  <span className="ml-2 font-semibold">{bestSession.totalEdits}</span>
                </div>
                {bestSession.pasteEvents !== undefined && bestSession.pasteEvents > 0 && (
                  <div className="text-vscode-foreground">
                    <span className="opacity-75">Paste Events:</span>
                    <span className="ml-2 font-semibold">{bestSession.pasteEvents}</span>
                  </div>
                )}
                {bestSession.burstCount !== undefined && bestSession.burstCount > 0 && (
                  <div className="text-vscode-foreground">
                    <span className="opacity-75">Bursts:</span>
                    <span className="ml-2 font-semibold">{bestSession.burstCount}</span>
                  </div>
                )}
                {bestSession.longestPauseMin !== undefined && bestSession.longestPauseMin > 0 && (
                  <div className="text-vscode-foreground">
                    <span className="opacity-75">Longest Pause:</span>
                    <span className="ml-2 font-semibold">{bestSession.longestPauseMin}m</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg text-center">
            <Keyboard className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
            <p className="text-sm text-vscode-descriptionForeground">No editing sessions yet. Start coding to build your first session!</p>
          </div>
        )}
      </section>

      {/* Top 3 Sessions */}
      {top3Sessions.length > 1 && (
        <section className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="text-brand-primary" size={20} strokeWidth={2} />
            <h2 className="text-base font-semibold text-vscode-editor-fg">
              Top 3 Sessions
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Rank
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Edits/Min
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Duration
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Time Range
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Insert/Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {top3Sessions.map((session: EditSession, index: number) => (
                  <tr key={session.id} className="hover:bg-vscode-list-hover-bg">
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="text-yellow-500" size={16} />}
                        {index === 1 && <Medal className="text-gray-400" size={16} />}
                        {index === 2 && <Medal className="text-orange-400" size={16} />}
                        <span className="text-sm font-medium text-vscode-editor-fg">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border">
                      <div className="text-sm font-semibold text-vscode-editor-fg">
                        {session.editsPerMin.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border text-xs text-vscode-foreground">
                      {formatDuration(session.durationMin)}
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border text-xs text-vscode-foreground opacity-80">
                      {formatTimeRange(session.startTs, session.endTs)}
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border text-xs text-vscode-foreground">
                      {Math.round(session.insertCharsPerMin)} / {Math.round(session.deleteCharsPerMin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* How it Works */}
      <section className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">
            How Edits per Minute Works
          </h3>
        </div>
        <div className="space-y-2 text-sm text-vscode-foreground">
          <p>
            <strong className="text-vscode-editor-fg">Session Start:</strong> Begins on your first edit operation
          </p>
          <p>
            <strong className="text-vscode-editor-fg">Session End:</strong> Automatically ends after 10 minutes of inactivity
          </p>
          <p>
            <strong className="text-vscode-editor-fg">Metrics:</strong> Calculated per-minute across the entire session duration
          </p>
          <p>
            <strong className="text-vscode-editor-fg">Display:</strong> Only your best (highest avg edits/min) session is highlighted
          </p>
          <p className="text-xs text-vscode-descriptionForeground pt-2 border-t border-vscode-panel-border">
            Higher edits/min indicates faster typing cadence. Burstiness shows variation in editing rhythm.
          </p>
        </div>
      </section>
    </div>
  );
};
