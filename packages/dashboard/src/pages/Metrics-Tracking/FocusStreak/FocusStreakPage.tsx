import { Trophy, Flame, Target, Folder, Award, Medal, Info } from 'lucide-react';
import { useFocusStreaks } from '../../../hooks/useFocusStreaks';
import { useAuth } from '../../../contexts/AuthContext';
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
      {/* Best Global Streak */}
      <section className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="text-brand-primary" size={20} strokeWidth={2} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">
            Best Global Streak
          </h2>
        </div>
        
        {bestGlobalStreak ? (
          <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="text-brand-accent flex-shrink-0" size={24} />
                  <div className="text-3xl font-bold text-brand-primary">
                    {formatDuration(bestGlobalStreak.durationMin)}
                  </div>
                </div>
                <div className="text-xs text-vscode-foreground opacity-80">
                  {formatDateTime(bestGlobalStreak.startTs)}
                </div>
                <div className="text-xs text-vscode-foreground opacity-80">
                  → {formatDateTime(bestGlobalStreak.endTs)}
                </div>
                <div className="text-[10px] text-vscode-descriptionForeground mt-2 font-mono break-all">
                  Session: {bestGlobalStreak.sessionId.substring(0, 16)}...
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg text-center">
            <Target className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
            <p className="text-sm text-vscode-descriptionForeground">No global streaks yet. Start coding to build your first streak!</p>
          </div>
        )}
      </section>

      {/* Best Per-File Streaks */}
      <section className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Folder className="text-brand-primary" size={20} strokeWidth={2} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">
            Best Per-File Streaks
          </h2>
        </div>
        
        {bestPerFileStreaks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Rank
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Language
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Duration
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs opacity-85 border-b border-vscode-panel-border text-vscode-foreground">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody>
                {bestPerFileStreaks.map((streak, index) => (
                  <tr key={streak.id} className="hover:bg-vscode-list-hover-bg">
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="text-yellow-500" size={16} />}
                        {index === 1 && <Medal className="text-gray-400" size={16} />}
                        {index === 2 && <Medal className="text-orange-400" size={16} />}
                        {index > 2 && <span className="w-4" />}
                        <span className="text-sm font-medium text-vscode-editor-fg">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-primary/10 text-brand-primary ring-1 ring-inset ring-brand-primary/20">
                        {streak.language || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border">
                      <div className="text-sm font-semibold text-vscode-editor-fg">
                        {formatDuration(streak.durationMin)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-vscode-panel-border text-xs text-vscode-foreground opacity-80">
                      {formatDateTime(streak.startTs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg text-center">
            <Folder className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
            <p className="text-sm text-vscode-descriptionForeground">No per-file streaks yet. Start focusing on a file to build streaks!</p>
          </div>
        )}
      </section>

      {/* How it Works */}
      <section className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">
            How Focus Streaks Work
          </h3>
        </div>
        <div className="space-y-3 text-sm text-vscode-foreground">
          <p>
            <strong className="text-vscode-editor-fg">Global Streak:</strong> Continuous coding activity across all files. 
            Breaks after 10 minutes of inactivity.
          </p>
          <p>
            <strong className="text-vscode-editor-fg">Per-File Streak:</strong> Continuous focus on a single file. 
            Tolerates micro-switches up to 30 seconds.
          </p>
          <p className="text-xs text-vscode-descriptionForeground pt-2 border-t border-vscode-panel-border">
            File paths are hashed for privacy. Only language and duration are tracked.
          </p>
        </div>
      </section>
    </div>
  );
};
