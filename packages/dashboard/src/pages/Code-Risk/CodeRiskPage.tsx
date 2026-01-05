import React from 'react';
import { Card } from '../../components/ui/Card';
import { useCodeRisk } from '../../hooks/useCodeRisk';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
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
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Code Risk Analysis</h1>
          <p className="text-gray-600 mt-2">
            AI-powered risk assessment for files with errors
          </p>
        </div>
        <button
          onClick={fetchActiveRisks}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {!hasActiveRisks ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No Active Risks Detected
          </h3>
          <p className="text-gray-600">
            Great job! All your files are error-free or risks have been resolved.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4" />
            <span>{activeRisks.length} active risk{activeRisks.length !== 1 ? 's' : ''} detected</span>
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
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    },
    Yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />
    },
    Red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
      icon: <AlertCircle className="w-6 h-6 text-red-600" />
    }
  };

  const scheme = colorSchemes[risk.colorCode];

  return (
    <Card className={`p-6 ${scheme.bg} ${scheme.border} border-2`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {scheme.icon}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {risk.fileName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{risk.fileUri}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${scheme.badge}`}>
            {risk.riskLevel} Risk
          </span>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded transition-colors disabled:opacity-50"
          >
            {dismissing ? 'Dismissing...' : 'Dismiss'}
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg">
        <div>
          <p className="text-sm text-gray-600">Errors</p>
          <p className="text-2xl font-bold text-gray-900">{risk.errorCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Lines of Code</p>
          <p className="text-2xl font-bold text-gray-900">{risk.loc}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Recent Edits</p>
          <p className="text-2xl font-bold text-gray-900">{risk.recentEdits}</p>
        </div>
      </div>

      {/* Risk Explanation */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 mb-2">Why is this risky?</h4>
        <p className={`${scheme.text}`}>{risk.riskExplanation}</p>
      </div>

      {/* Error Explanation */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 mb-2">What's happening?</h4>
        <p className="text-gray-700">{risk.errorExplanation}</p>
      </div>

      {/* Fix Steps */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">How to fix:</h4>
        <ol className="list-decimal list-inside space-y-2">
          {risk.fixSteps.map((step, index) => (
            <li key={index} className="text-gray-700">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Timestamp */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Detected: {new Date(risk.createdAt).toLocaleString()}
        </p>
      </div>
    </Card>
  );
};

export default CodeRiskPage;
