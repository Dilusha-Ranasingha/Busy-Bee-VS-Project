import React from 'react';
import type { Warning } from '../../types/ML-Forecasting/mlForecasting.types';

interface EarlyWarningsProps {
  warnings: Warning[];
}

const EarlyWarnings: React.FC<EarlyWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  const getWarningColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-900/20 border-red-700 text-red-400';
      case 'medium':
        return 'bg-yellow-900/20 border-yellow-700 text-yellow-400';
      case 'low':
        return 'bg-blue-900/20 border-blue-700 text-blue-400';
      default:
        return 'bg-gray-900/20 border-gray-700 text-gray-400';
    }
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'infeasible':
        return '⚠️';
      case 'focus_risk':
        return '🎯';
      case 'low_focus':
        return '💤';
      case 'high_errors':
        return '🐛';
      default:
        return '⚡';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <span>⚡</span>
        Early Warnings
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warnings.map((warning, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getWarningColor(warning.severity)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getWarningIcon(warning.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold capitalize">
                    {warning.type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      warning.severity === 'high'
                        ? 'bg-red-700 text-red-100'
                        : warning.severity === 'medium'
                        ? 'bg-yellow-700 text-yellow-100'
                        : 'bg-blue-700 text-blue-100'
                    }`}
                  >
                    {warning.severity}
                  </span>
                </div>
                {warning.date && (
                  <div className="text-sm opacity-75 mb-2">
                    {new Date(warning.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                )}
                <p className="text-sm">{warning.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EarlyWarnings;
