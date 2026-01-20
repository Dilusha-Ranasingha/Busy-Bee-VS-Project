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
              plan.is_feasible ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${plan.feasibility_score}%` }}
          ></div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-sm ${plan.is_feasible ? 'text-green-400' : 'text-yellow-400'}`}>
            {plan.is_feasible ? '✓ Achievable' : '⚠ Stretch Goal'}
          </span>
          <span className="text-sm text-gray-400">
            • {plan.total_available_hours?.toFixed(1)}h predicted capacity
          </span>
        </div>
        
        {/* Target Adjustment Details */}
        {plan.target_adjustment && (
          <div className="mt-3 p-3 bg-gray-600/50 rounded border border-gray-500">
            <div className="flex items-start gap-2">
              <span className="text-xl">🎯</span>
              <div className="flex-1">
                <div className="text-sm text-gray-300 mb-1">
                  <strong>Your Target:</strong> {plan.target_adjustment.original_target}h
                </div>
                {plan.target_adjustment.type === 'stretch_goal' ? (
                  <>
                    <div className="text-sm text-yellow-300 mb-1">
                      <strong>Stretch Required:</strong> +{plan.target_adjustment.stretch_required}h 
                      ({plan.target_adjustment.stretch_percentage?.toFixed(0)}% above capacity)
                    </div>
                    <div className="text-sm text-green-300 mb-2">
                      <strong>Suggested Stretch:</strong> {plan.target_adjustment.suggested_target}h 
                      (achievable with focus)
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-blue-300 mb-2">
                    <strong>Suggested:</strong> {plan.target_adjustment.suggested_target}h 
                    (you have capacity for more)
                  </div>
                )}
                <p className="text-xs text-gray-400">{plan.target_adjustment.reason}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily Plan - Detailed */}
      {plan.daily_schedule && plan.daily_schedule.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">📅 Daily Plan (Detailed)</h4>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {plan.daily_schedule.map((day, index) => (
              <div
                key={index}
                className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-600">
                  <div className="flex-1">
                    <div className="text-white font-semibold text-base">
                      {day.day_name || new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-white font-semibold text-lg">
                        {day.allocated_hours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-400">
                        of {day.available_hours.toFixed(1)}h capacity
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded font-medium ${getProductivityColor(
                        day.productivity_level
                      )}`}
                    >
                      {day.productivity_level}
                    </span>
                  </div>
                </div>

                {/* Best Time Windows */}
                {day.recommended_time_windows && day.recommended_time_windows.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-400 mb-2">🕐 Best Time to Work:</div>
                    {day.recommended_time_windows.map((window, idx) => (
                      <div key={idx} className="bg-blue-900/20 border border-blue-700/50 rounded px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-300 font-semibold">{window.time_range}</span>
                          <span className="text-xs text-gray-400">
                            {window.confidence}% confidence
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{window.reason}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Predicted Metrics */}
                {day.metrics_summary && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-400 mb-2">📊 Predicted Performance:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-600/50 rounded px-2 py-1.5">
                        <div className="text-xs text-gray-400">Focus</div>
                        <div className="text-sm text-green-300 font-semibold">
                          {day.metrics_summary.predicted_focus_min?.toFixed(0)}min
                        </div>
                      </div>
                      <div className="bg-gray-600/50 rounded px-2 py-1.5">
                        <div className="text-xs text-gray-400">File Switches</div>
                        <div className="text-sm text-yellow-300 font-semibold">
                          {day.metrics_summary.predicted_file_switches_per_min?.toFixed(2)}/min
                        </div>
                      </div>
                      <div className="bg-gray-600/50 rounded px-2 py-1.5">
                        <div className="text-xs text-gray-400">Errors</div>
                        <div className="text-sm text-red-300 font-semibold">
                          {day.metrics_summary.predicted_errors_per_kloc?.toFixed(1)}/kloc
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Recommendations */}
                {day.task_recommendations && day.task_recommendations.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-2">✅ Recommended Tasks:</div>
                    <div className="space-y-1.5">
                      {day.task_recommendations.map((task, idx) => (
                        <div key={idx} className="bg-gray-600/30 rounded px-3 py-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-white font-semibold">
                                  {(task as any).task_type || task.task}
                                </span>
                                {task.priority && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      task.priority === 'high' || task.priority === 'critical'
                                        ? 'bg-red-700 text-red-100'
                                        : task.priority === 'medium'
                                        ? 'bg-yellow-700 text-yellow-100'
                                        : 'bg-gray-700 text-gray-100'
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                )}
                              </div>
                              {(task as any).description && (
                                <div className="text-xs text-gray-300 mb-1">
                                  {(task as any).description}
                                </div>
                              )}
                              <div className="text-xs text-gray-400">{task.reason}</div>
                              {(task as any).time_allocation && (
                                <div className="text-xs text-blue-300 mt-1">
                                  🕒 {(task as any).time_allocation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {day.note && (
                  <div className="mt-3 text-xs text-gray-400 italic">Note: {day.note}</div>
                )}
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
