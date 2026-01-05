import React from 'react';
import { useCodeRisk } from '../../hooks/useCodeRisk';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import type { CodeRiskItem } from '../../types/Code-Risk/codeRisk.types';

export const CodeRiskPage: React.FC = () => {
  const { 
    activeRisks, 
    loading, 
    error, 
    fetchActiveRisks, 
    dismissRisk,
    hasActiveRisks 
  } = useCodeRisk(true, 30000); // Auto-refresh every 30 seconds

  if (loading && activeRisks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg border border-vscode-input-error-border bg-vscode-input-error-bg text-vscode-input-error-fg text-sm">
        <div className="flex items-center gap-2">
          <XCircle size={16} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-orange-500" size={20} />
          <h1 className="text-base font-semibold text-vscode-editor-fg">Code Risk Analysis</h1>
        </div>
        <button
          onClick={fetchActiveRisks}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-primary text-white rounded text-xs hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {!hasActiveRisks ? (
        <div className="border border-vscode-panel-border rounded-lg p-4 bg-vscode-widget-bg text-center">
          <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
          <h3 className="text-sm font-semibold text-vscode-editor-fg mb-1">
            No Active Risks Detected
          </h3>
          <p className="text-xs text-vscode-descriptionForeground">
            All files are error-free or risks have been resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 border border-vscode-panel-border rounded-lg bg-vscode-widget-bg">
            <AlertTriangle className="text-orange-500" size={16} />
            <span className="text-xs text-vscode-foreground">{activeRisks.length} active risk{activeRisks.length !== 1 ? 's' : ''} detected</span>
          </div>

          {activeRisks.map((risk) => (
            <CodeRiskCard
              key={risk.id}
              risk={risk}
              onDismiss={dismissRisk}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CodeRiskCardProps {
  risk: CodeRiskItem;
  onDismiss: (riskId: string) => Promise<void>;
}

const CodeRiskCard: React.FC<CodeRiskCardProps> = ({ risk, onDismiss }) => {
  const [dismissing, setDismissing] = React.useState(false);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss(risk.id);
    } catch (err) {
      console.error('Failed to dismiss risk:', err);
      alert('Failed to dismiss risk. Please try again.');
    } finally {
      setDismissing(false);
    }
  };

  // Color schemes
  const colorSchemes = {
    Green: {
      bg: 'bg-vscode-widget-bg',
      border: 'border-green-500',
      text: 'text-green-600',
      badge: 'bg-green-500 bg-opacity-10 text-green-600 border border-green-500',
      icon: <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
    },
    Yellow: {
      bg: 'bg-vscode-widget-bg',
      border: 'border-yellow-500',
      text: 'text-yellow-600',
      badge: 'bg-yellow-500 bg-opacity-10 text-yellow-600 border border-yellow-500',
      icon: <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
    },
    Red: {
      bg: 'bg-vscode-widget-bg',
      border: 'border-red-500',
      text: 'text-red-600',
      badge: 'bg-red-500 bg-opacity-10 text-red-600 border border-red-500',
      icon: <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
    }
  };

  const scheme = colorSchemes[risk.colorCode];

  return (
    <div className={`border-2 ${scheme.border} ${scheme.bg} rounded-xl p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {scheme.icon}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-vscode-editor-fg truncate">
              {risk.fileName}
            </h3>
            <p className="text-xs text-vscode-descriptionForeground truncate">{risk.fileUri}</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="px-2 py-1 text-xs text-vscode-foreground hover:bg-vscode-editor-bg rounded transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {dismissing ? 'Dismissing...' : 'Dismiss'}
        </button>
      </div>

      <div className={`px-2 py-1 rounded text-xs font-medium ${scheme.badge} inline-flex items-center justify-center`}>
        {risk.riskLevel} Risk
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-vscode-panel-border rounded-lg p-2 bg-vscode-editor-bg">
          <p className="text-xs text-vscode-foreground opacity-75">Errors</p>
          <p className="text-lg font-bold text-vscode-editor-fg">{risk.errorCount}</p>
        </div>
        <div className="border border-vscode-panel-border rounded-lg p-2 bg-vscode-editor-bg">
          <p className="text-xs text-vscode-foreground opacity-75">LOC</p>
          <p className="text-lg font-bold text-vscode-editor-fg">{risk.loc}</p>
        </div>
        <div className="border border-vscode-panel-border rounded-lg p-2 bg-vscode-editor-bg">
          <p className="text-xs text-vscode-foreground opacity-75">Edits</p>
          <p className="text-lg font-bold text-vscode-editor-fg">{risk.recentEdits}</p>
        </div>
      </div>

      {/* Risk Explanation */}
      <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
        <h4 className="text-xs font-semibold text-vscode-editor-fg mb-1.5 flex items-center gap-1.5">
          <AlertTriangle size={14} />
          Why is this risky?
        </h4>
        <p className={`text-xs ${scheme.text}`}>{risk.riskExplanation}</p>
      </div>

      {/* Error Explanation */}
      <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
        <h4 className="text-xs font-semibold text-vscode-editor-fg mb-1.5 flex items-center gap-1.5">
          <Info size={14} />
          What's happening?
        </h4>
        <p className="text-xs text-vscode-foreground">{risk.errorExplanation}</p>
      </div>

      {/* Fix Steps */}
      <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
        <h4 className="text-xs font-semibold text-vscode-editor-fg mb-2 flex items-center gap-1.5">
          <CheckCircle size={14} />
          How to fix:
        </h4>
        <ol className="space-y-1.5">
          {risk.fixSteps.map((step, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-vscode-foreground">
              <span className="text-brand-primary mt-0.5">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Timestamp */}
      <div className="pt-2 border-t border-vscode-panel-border">
        <p className="text-xs text-vscode-descriptionForeground">
          Detected: {new Date(risk.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default CodeRiskPage;
