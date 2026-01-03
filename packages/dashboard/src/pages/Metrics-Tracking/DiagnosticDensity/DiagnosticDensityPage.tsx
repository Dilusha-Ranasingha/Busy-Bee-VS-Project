import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info, Code } from 'lucide-react';
import { useDiagnosticDensity } from '../../../hooks/useDiagnosticDensity';
import type { DiagnosticDensityEvent } from '../../../services/Metrics-Tracking/diagnosticDensity.service';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { SignInPrompt } from '../../../components/Auth/GitHubAuth';

export function DiagnosticDensityPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { extremes, isLoading, error } = useDiagnosticDensity(user?.id || null);

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
        Error loading diagnostic density data: {error.message}
      </div>
    );
  }

  const hasAnyData = extremes && (extremes.highest || extremes.lowestNonZero || extremes.latestZero);

  if (!hasAnyData) {
    return (
      <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-editor-bg text-center">
        <Code className="mx-auto mb-2 text-vscode-descriptionForeground" size={32} />
        <p className="text-sm text-vscode-descriptionForeground">
          No diagnostic density data available yet. Write code with errors/warnings to see metrics!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {extremes?.highest && (
          <EventCard
            event={extremes.highest}
            title="Highest Density (Worst)"
            subtitle="Most problems per KLOC"
            variant="error"
          />
        )}

        {extremes?.lowestNonZero && (
          <EventCard
            event={extremes.lowestNonZero}
            title="Lowest Non-Zero (Best)"
            subtitle="Cleanest code with some issues"
            variant="warning"
          />
        )}

        {extremes?.latestZero && (
          <EventCard
            event={extremes.latestZero}
            title="Latest Clean (Zero)"
            subtitle="No errors or warnings"
            variant="success"
          />
        )}
      </div>

      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-brand-primary" size={20} strokeWidth={2} />
          <h3 className="text-base font-semibold text-vscode-editor-fg">Understanding the Metrics</h3>
        </div>
        <ul className="text-sm text-vscode-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">KLOC:</strong> Thousand Lines Of Code (e.g., 200 lines = 0.2 KLOC)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Density:</strong> (Errors + Warnings) / KLOC</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Event-Based:</strong> Snapshot created when diagnostics change</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Debounced:</strong> 250ms delay to avoid rapid changes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-primary mt-0.5">•</span>
            <span><strong className="text-vscode-editor-fg">Flicker Filtered:</strong> Ignores diagnostics that appear/vanish within 2 seconds</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: DiagnosticDensityEvent;
  title: string;
  subtitle: string;
  variant: 'error' | 'warning' | 'success';
}

function EventCard({ event, title, subtitle, variant }: EventCardProps) {
  const timestamp = new Date(event.ts);
  
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const variantConfig = {
    error: {
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-600',
      badgeBorder: 'ring-red-500/20',
    },
    warning: {
      icon: TrendingDown,
      iconColor: 'text-yellow-500',
      valueColor: 'text-yellow-600',
      badgeBg: 'bg-yellow-500/10',
      badgeText: 'text-yellow-600',
      badgeBorder: 'ring-yellow-500/20',
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      valueColor: 'text-green-600',
      badgeBg: 'bg-green-500/10',
      badgeText: 'text-green-600',
      badgeBorder: 'ring-green-500/20',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;
  const problems = event.errors + event.warnings;

  return (
    <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
      <div className="flex items-start gap-3 mb-3">
        <Icon className={config.iconColor} size={20} strokeWidth={2} />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-vscode-editor-fg">{title}</h3>
          <p className="text-xs text-vscode-foreground opacity-80">{subtitle}</p>
        </div>
      </div>

      <div className="bg-vscode-editor-bg border border-vscode-panel-border rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className={config.iconColor} size={16} />
          <div className={`text-2xl font-bold ${config.valueColor}`}>
            {event.densityPerKloc.toFixed(2)}
          </div>
        </div>
        <div className="text-xs text-vscode-foreground opacity-75">per KLOC</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <MetricRow label="Problems" value={`${problems}`} />
        <MetricRow label="Errors" value={`${event.errors}`} />
        <MetricRow label="Warnings" value={`${event.warnings}`} />
        <MetricRow label="Lines" value={`${event.lineCount}`} />
      </div>

      <div className="text-[10px] text-vscode-foreground opacity-75 mb-2">
        KLOC: {(event.lineCount / 1000).toFixed(3)}
      </div>

      <div className="pt-3 border-t border-vscode-panel-border space-y-2">
        <div className="text-xs text-vscode-foreground opacity-80">
          {formatDateTime(timestamp)}
        </div>
        {event.language && (
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.badgeBg} ${config.badgeText} ring-1 ring-inset ${config.badgeBorder}`}>
              {event.language.toUpperCase()}
            </span>
          </div>
        )}
        <div className="text-[10px] text-vscode-descriptionForeground font-mono break-all">
          {event.fileHash}
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs border border-vscode-panel-border rounded px-2 py-1.5 bg-vscode-editor-bg">
      <span className="text-vscode-foreground opacity-75">{label}:</span>
      <span className="font-semibold text-vscode-editor-fg">{value}</span>
    </div>
  );
}
