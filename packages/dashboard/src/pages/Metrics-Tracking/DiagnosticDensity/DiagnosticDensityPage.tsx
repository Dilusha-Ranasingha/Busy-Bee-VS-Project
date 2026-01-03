import { useDiagnosticDensity } from '../../../hooks/useDiagnosticDensity';
import type { DiagnosticDensitySession } from '../../../services/Metrics-Tracking/diagnosticDensity.service';
import { Card } from '../../../components/ui';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';

export function DiagnosticDensityPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { bestSessions, isLoading, error } = useDiagnosticDensity(user?.id || null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading diagnostic density data: {error.message}</p>
      </div>
    );
  }

  const hasAnyData = bestSessions && (bestSessions.highest || bestSessions.lowest);

  if (!hasAnyData) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">
          No diagnostic density sessions yet. Create and fix errors/warnings to see metrics!
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Diagnostics Density Sessions</h1>
        <p className="text-gray-600 mt-2">
          Track error/warning sessions from first appearance to resolution
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bestSessions?.highest && (
          <SessionCard
            session={bestSessions.highest}
            title="Worst Session"
            subtitle="Highest peak density"
            color="red"
          />
        )}

        {bestSessions?.lowest && (
          <SessionCard
            session={bestSessions.lowest}
            title="Best Session"
            subtitle="Lowest peak density"
            color="green"
          />
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Sessions Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Session Start:</strong> When errors/warnings first appear in a file</li>
          <li>• <strong>Session End:</strong> When all errors/warnings are resolved (reach 0)</li>
          <li>• <strong>Peak Tracking:</strong> Records the highest error density during the session</li>
          <li>• <strong>KLOC:</strong> Thousand Lines Of Code (e.g., 200 lines = 0.2 KLOC)</li>
          <li>• <strong>Density:</strong> (Peak Errors + Peak Warnings) / KLOC</li>
        </ul>
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: DiagnosticDensitySession;
  title: string;
  subtitle: string;
  color: 'red' | 'green';
}

function SessionCard({ session, title, subtitle, color }: SessionCardProps) {
  const startDate = new Date(session.startTs);
  const endDate = new Date(session.endTs);
  
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      value: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      value: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
    },
  };

  const classes = colorClasses[color];
  const peakProblems = session.peakErrors + session.peakWarnings;

  return (
    <Card className={`p-6 ${classes.bg} border-2 ${classes.border}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>

      <div className="mb-4">
        <div className={`text-4xl font-bold ${classes.value}`}>
          {session.peakDensityPerKloc.toFixed(2)}
        </div>
        <div className="text-sm text-gray-600 mt-1">per KLOC (peak)</div>
      </div>

      <div className="space-y-2 mb-4">
        <MetricRow label="Peak Problems" value={`${peakProblems}`} />
        <MetricRow label="Peak Errors" value={`${session.peakErrors}`} />
        <MetricRow label="Peak Warnings" value={`${session.peakWarnings}`} />
        <MetricRow label="Peak Lines" value={`${session.peakLineCount}`} />
        <MetricRow label="Peak KLOC" value={(session.peakLineCount / 1000).toFixed(3)} />
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-600">
          <strong>Duration:</strong> {session.durationMin.toFixed(2)} minutes
        </div>
        <div className="text-xs text-gray-600">
          <strong>Started:</strong> {formatDateTime(startDate)}
        </div>
        <div className="text-xs text-gray-600">
          <strong>Resolved:</strong> {formatDateTime(endDate)}
        </div>
        {session.language && (
          <div>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${classes.badge}`}>
              {session.language.toUpperCase()}
            </span>
          </div>
        )}
        <div className="text-xs text-gray-500 font-mono break-all">
          File: {session.fileHash}
        </div>
      </div>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
