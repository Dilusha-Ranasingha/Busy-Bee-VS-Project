import React from 'react';
import type { ProductivityPlan } from '../../types/ML-Forecasting/mlForecasting.types';

interface PlanResultsViewProps {
  plan: ProductivityPlan;
  onClose: () => void;
}

const PlanResultsView: React.FC<PlanResultsViewProps> = ({ plan, onClose }) => {
  if (!plan || plan.status === 'error') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Error: {plan?.message || 'Failed to generate plan'}</p>
        </div>
      </div>
    );
  }

  const getFeasibilityColor = (score: number | undefined) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProductivityColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-700 text-green-100';
      case 'medium':
        return 'bg-yellow-700 text-yellow-100';
      case 'low':
        return 'bg-red-700 text-red-100';
      default:
        return 'bg-gray-700 text-gray-100';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Productivity Plan</h3>
          <p className="text-sm text-gray-400">
            {plan.plan_start_date && new Date(plan.plan_start_date).toLocaleDateString()} -{' '}
            {plan.plan_end_date && new Date(plan.plan_end_date).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Feasibility Score */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">Feasibility</span>
          <span className={`text-2xl font-bold ${getFeasibilityColor(plan.feasibility_score)}`}>
            {plan.feasibility_score?.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              plan.is_feasible ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${plan.feasibility_score}%` }}
          ></div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-sm ${plan.is_feasible ? 'text-green-400' : 'text-red-400'}`}>
            {plan.is_feasible ? '✓ Feasible' : '✗ Not Feasible'}
          </span>
          <span className="text-sm text-gray-400">
            • {plan.total_available_hours?.toFixed(1)}h available / {plan.target_hours}h target
          </span>
        </div>
      </div>

      {/* Best Hours */}
      {plan.best_hours && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Best Working Hours</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⏰</span>
            <span className="text-white font-semibold capitalize">
              {plan.best_hours.recommended_time}
            </span>
            <span className="text-gray-400">({plan.best_hours.hours})</span>
          </div>
          <p className="text-sm text-gray-400">{plan.best_hours.reason}</p>
        </div>
      )}

      {/* Daily Schedule */}
      {plan.daily_schedule && plan.daily_schedule.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Daily Schedule</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {plan.daily_schedule.map((day, index) => (
              <div
                key={index}
                className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  {day.note && <div className="text-xs text-gray-400 mt-1">{day.note}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      {day.allocated_hours.toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-400">
                      of {day.available_hours.toFixed(1)}h
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getProductivityColor(
                      day.productivity_level
                    )}`}
                  >
                    {day.productivity_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated At */}
      {plan.generated_at && (
        <div className="text-xs text-gray-500 text-center">
          Generated {new Date(plan.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default PlanResultsView;
