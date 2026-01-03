import { useSaveEditSessions } from '../../../hooks/useSaveEditSessions';
import type { SaveEditSession } from '../../../services/Metrics-Tracking/saveEditSessions.service';
import { Card } from '../../../components/ui';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';

export function SaveEditRatioPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { bestSession, isLoading, error } = useSaveEditSessions(user?.id || null);

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
        <p className="text-red-500">Error loading save-edit ratio data: {error.message}</p>
      </div>
    );
  }

  if (!bestSession) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No save-edit ratio data available yet. Start coding to see your saving habits!</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Save-to-Edit Ratio</h1>
        <p className="text-gray-600 mt-2">
          Your best session showing the balance between edits and saves
        </p>
      </div>

      <BestSessionCard session={bestSession} />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Understanding the Metrics</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Effective Ratio:</strong> Combines manual saves and meaningful auto-saves</li>
          <li>• <strong>Auto-save Compression:</strong> Consecutive auto-saves within 60 seconds count as one</li>
          <li>• <strong>Checkpoint Auto-saves:</strong> Auto-saves after ≥1 minute of no edits are counted as intentional</li>
          <li>• <strong>Manual Save Share:</strong> Percentage of effective saves that were manual (Cmd+S)</li>
        </ul>
      </div>
    </div>
  );
}

function BestSessionCard({ session }: { session: SaveEditSession }) {
  const startDate = new Date(session.startTs);
  const endDate = new Date(session.endTs);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalAutosaves = session.savesAutosaveDelay + session.savesAutosaveFocusout;
  const totalSaves = session.savesManual + totalAutosaves;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Best Session</h2>
          <p className="text-sm text-gray-600 mt-1">
            {formatDate(startDate)} • {formatTime(startDate)} - {formatTime(endDate)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Duration: {session.durationMin.toFixed(1)} minutes
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-green-600">
            {session.effectiveSaveToEditRatio.toFixed(3)}
          </div>
          <p className="text-sm text-gray-600 mt-1">Effective Ratio</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricBox
          label="Total Edits"
          value={session.editsTotal.toString()}
          color="blue"
        />
        <MetricBox
          label="Manual Saves"
          value={session.savesManual.toString()}
          color="green"
        />
        <MetricBox
          label="Effective Auto-saves"
          value={session.autosavesEffective.toString()}
          color="purple"
        />
        <MetricBox
          label="Checkpoint Saves"
          value={session.checkpointAutosaveCount.toString()}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RatioBox
          label="Manual Ratio"
          value={session.saveToEditRatioManual}
          description="Manual saves per edit"
        />
        <RatioBox
          label="Auto-save Ratio"
          value={session.saveToEditRatioAutosave}
          description="Effective auto-saves per edit"
        />
        <RatioBox
          label="Effective Ratio"
          value={session.effectiveSaveToEditRatio}
          description="Combined saves per edit"
          highlighted
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <DetailMetric
          label="Median Gap"
          value={
            session.medianSecsBetweenSaves
              ? `${session.medianSecsBetweenSaves.toFixed(1)}s`
              : 'N/A'
          }
        />
        <DetailMetric
          label="Avg Gap"
          value={
            session.avgSecsBetweenSaves
              ? `${session.avgSecsBetweenSaves.toFixed(1)}s`
              : 'N/A'
          }
        />
        <DetailMetric
          label="Manual Share"
          value={
            session.manualSaveShare !== null && session.manualSaveShare !== undefined
              ? `${session.manualSaveShare.toFixed(1)}%`
              : 'N/A'
          }
        />
        <DetailMetric
          label="Total Saves"
          value={totalSaves.toString()}
          subtext={`${totalAutosaves} auto`}
        />
      </div>
    </Card>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  );
}

function RatioBox({
  label,
  value,
  description,
  highlighted = false,
}: {
  label: string;
  value: number;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlighted
          ? 'bg-green-50 border-green-300'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${
          highlighted ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {value.toFixed(3)}
      </div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-0.5">{subtext}</div>}
    </div>
  );
}
