import React from 'react';
import type { PlanData } from '../../types/ML-Forecasting/chatbot.types';

interface PlanResultCardProps {
  data: PlanData;
}

const PlanResultCard: React.FC<PlanResultCardProps> = ({ data }) => {
  const getProductivityColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return 'bg-green-700 text-green-100';
      case 'medium':
        return 'bg-yellow-700 text-yellow-100';
      case 'low':
        return 'bg-red-700 text-red-100';
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>📅</span>
          Work Plan
        </h4>
        <span
          className={`text-xs px-2 py-1 rounded ${
            data.isFeasible ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
          }`}
        >
          {data.isFeasible ? '✓ Feasible' : '✗ Not Feasible'}
        </span>
      </div>

      <div className="bg-gray-800/50 rounded p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Feasibility</span>
          <span className="text-white font-semibold">{data.feasibilityScore}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              data.isFeasible ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${data.feasibilityScore}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400">Daily Schedule</div>
        {data.schedule.slice(0, 3).map((day, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
          >
            <div className="flex-1">
              <div className="text-sm text-white">
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">{day.hours}h</span>
              <span className={`text-xs px-2 py-1 rounded ${getProductivityColor(day.productivity)}`}>
                {day.productivity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {data.schedule.length > 3 && (
        <p className="text-xs text-gray-500 text-center">
          + {data.schedule.length - 3} more days
        </p>
      )}

      {data.warnings.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-yellow-400">⚠️ Warnings</div>
          {data.warnings.slice(0, 2).map((warning, index) => (
            <div key={index} className="text-xs text-gray-400 pl-4">
              • {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanResultCard;
