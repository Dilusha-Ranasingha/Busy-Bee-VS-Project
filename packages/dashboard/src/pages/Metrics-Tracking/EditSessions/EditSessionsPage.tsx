import { useEditSessions } from '../../../hooks/useEditSessions';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui';
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
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edits per Minute</h1>
        <p className="text-gray-600">
          Track your best editing cadence and activity sessions
        </p>
      </div>

      {/* Best Session */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🏆 Best Editing Cadence
        </h2>
        
        {bestSession ? (
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Metric */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Best Edits/Min</div>
                <div className="text-5xl font-bold text-green-600 mb-2">
                  {bestSession.editsPerMin.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatTimeRange(bestSession.startTs, bestSession.endTs)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Duration: {formatDuration(bestSession.durationMin)}
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Insert/min</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {Math.round(bestSession.insertCharsPerMin)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Delete/min</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {Math.round(bestSession.deleteCharsPerMin)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Add/Delete Ratio</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {bestSession.addDeleteRatio.toFixed(2)}
                  </div>
                </div>
                {bestSession.typingBurstinessIndex !== undefined && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Burstiness</div>
                    <div className="text-2xl font-semibold text-gray-800">
                      {bestSession.typingBurstinessIndex.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Details */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Edits:</span>
                  <span className="ml-2 font-semibold">{bestSession.totalEdits}</span>
                </div>
                {bestSession.pasteEvents !== undefined && bestSession.pasteEvents > 0 && (
                  <div>
                    <span className="text-gray-600">Paste Events:</span>
                    <span className="ml-2 font-semibold">{bestSession.pasteEvents}</span>
                  </div>
                )}
                {bestSession.burstCount !== undefined && bestSession.burstCount > 0 && (
                  <div>
                    <span className="text-gray-600">Bursts:</span>
                    <span className="ml-2 font-semibold">{bestSession.burstCount}</span>
                  </div>
                )}
                {bestSession.longestPauseMin !== undefined && bestSession.longestPauseMin > 0 && (
                  <div>
                    <span className="text-gray-600">Longest Pause:</span>
                    <span className="ml-2 font-semibold">{bestSession.longestPauseMin}m</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">⌨️</div>
            <p>No editing sessions yet. Start coding to build your first session!</p>
          </Card>
        )}
      </section>

      {/* Top 3 Sessions */}
      {top3Sessions.length > 1 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📊 Top 3 Sessions
          </h2>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Edits/Min
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Insert/Delete
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {top3Sessions.map((session: EditSession, index: number) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                        {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                        {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                        <span className="text-sm font-medium text-gray-900">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {session.editsPerMin.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(session.durationMin)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatTimeRange(session.startTs, session.endTs)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
      <section className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          How Edits per Minute Works
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Session Start:</strong> Begins on your first edit operation
          </p>
          <p>
            <strong>Session End:</strong> Automatically ends after 10 minutes of inactivity
          </p>
          <p>
            <strong>Metrics:</strong> Calculated per-minute across the entire session duration
          </p>
          <p>
            <strong>Display:</strong> Only your best (highest avg edits/min) session is highlighted
          </p>
          <p className="text-xs text-gray-500 mt-4">
            💡 Tip: Higher edits/min indicates faster typing cadence. Burstiness shows variation in editing rhythm.
          </p>
        </div>
      </section>
    </div>
  );
};
