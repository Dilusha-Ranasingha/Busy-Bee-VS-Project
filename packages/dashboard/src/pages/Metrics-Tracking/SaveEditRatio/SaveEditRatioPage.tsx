import { Save, Edit, Clock, Info, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useSaveEditSessions } from '../../../hooks/useSaveEditSessions';
import type { SaveEditSession } from '../../../services/Metrics-Tracking/saveEditSessions.service';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';

export function SaveEditRatioPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { bestSession, isLoading, error } = useSaveEditSessions(user?.id || null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg border border-vscode-input-error-border bg-vscode-input-error-bg text-vscode-input-error-fg text-sm">
        Error loading save-edit ratio data: {error.message}
      </div>
    );
  }

  if (!bestSession) {
    return (
      <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg text-center">
        <Save className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
        <p className="text-sm text-vscode-descriptionForeground">No save-edit ratio data available yet. Start coding to see your saving habits!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BestSessionCard session={bestSession} />

      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">Understanding the Metrics</h3>
        </div>
        <ul className="text-sm text-vscode-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Effective Ratio:</strong> Combines manual saves and meaningful auto-saves</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Auto-save Compression:</strong> Consecutive auto-saves within 60 seconds count as one</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Checkpoint Auto-saves:</strong> Auto-saves after ≥1 minute of no edits are counted as intentional</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Manual Save Share:</strong> Percentage of effective saves that were manual (Cmd+S)</span>
          </li>
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
    <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-brand-primary flex-shrink-0" size={20} />
            <h2 className="text-base font-semibold text-vscode-editor-fg">Best Session</h2>
          </div>
          <p className="text-xs text-vscode-foreground opacity-80">
            {formatDate(startDate)} • {formatTime(startDate)} - {formatTime(endDate)}
          </p>
          <p className="text-[10px] text-vscode-descriptionForeground mt-1">
            Duration: {session.durationMin.toFixed(1)} minutes
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-brand-primary">
            {session.effectiveSaveToEditRatio.toFixed(3)}
          </div>
          <p className="text-xs text-vscode-foreground opacity-80 mt-1">Effective Ratio</p>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Total Edits"
          value={session.editsTotal.toString()}
          icon={Edit}
        />
        <MetricBox
          label="Manual Saves"
          value={session.savesManual.toString()}
          icon={Save}
        />
        <MetricBox
          label="Effective Auto-saves"
          value={session.autosavesEffective.toString()}
          icon={Clock}
        />
        <MetricBox
          label="Checkpoint Saves"
          value={session.checkpointAutosaveCount.toString()}
          icon={CheckCircle2}
        />
      </div>

      {/* Ratio Metrics */}
      <div className="grid grid-cols-1 gap-3">
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

      {/* Detail Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-vscode-panel-border">
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
    </div>
  );
}

function MetricBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="text-brand-primary" size={14} />
        <div className="text-[10px] text-vscode-foreground opacity-75">{label}</div>
      </div>
      <div className="text-lg font-bold text-vscode-editor-fg">{value}</div>
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
      className={`p-3 rounded-lg border ${
        highlighted
          ? 'bg-brand-primary/5 border-brand-primary/30'
          : 'bg-vscode-editor-bg border-vscode-panel-border'
      }`}
    >
      <div className="text-xs text-vscode-foreground opacity-80 mb-1">{label}</div>
      <div
        className={`text-xl font-bold ${
          highlighted ? 'text-brand-primary' : 'text-vscode-editor-fg'
        }`}
      >
        {value.toFixed(3)}
      </div>
      <div className="text-[10px] text-vscode-descriptionForeground mt-1">{description}</div>
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
      <div className="text-[10px] text-vscode-foreground opacity-75 mb-1">{label}</div>
      <div className="text-sm font-semibold text-vscode-editor-fg">{value}</div>
      {subtext && <div className="text-[10px] text-vscode-descriptionForeground mt-0.5">{subtext}</div>}
    </div>
  );
}
