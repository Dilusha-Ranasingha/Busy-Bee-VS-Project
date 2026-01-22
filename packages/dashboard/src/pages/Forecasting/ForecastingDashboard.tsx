import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useForecast, useGeneratePlan, useTrainModel, useModelInfo } from '../../hooks/useForecast';
import ForecastChart from './ForecastChart';
import PlanGeneratorForm from './PlanGeneratorForm';
import PlanResultsView from './PlanResultsView';
import EarlyWarnings from './EarlyWarnings';
import ModelStatus from './ModelStatus';

const ForecastingDashboard: React.FC = () => {
  const { user } = useAuth();
  const [forecastDays, setForecastDays] = useState(7);
  
  // TEMPORARY: Use test user for demo since we have synthetic data for test users
  const testUserId = 'test_user_high_performer'; // TODO: Change back to user?.id after real data collection
  const effectiveUserId = testUserId; // user?.id || 'test_user_high_performer';
  
  // Fetch forecast data
  const { forecast, isLoading: forecastLoading, error: forecastError, refetch } = useForecast(
    effectiveUserId,
    forecastDays
  );

  // Plan generator
  const { plan, isGenerating, error: planError, generatePlan, reset } = useGeneratePlan();

  // Model training
  const { trainingResult, isTraining, error: trainingError, trainModel } = useTrainModel();

  // Model info
  const { modelInfo, isLoading: modelInfoLoading, refetch: refetchModelInfo } = useModelInfo(
    effectiveUserId
  );

  const handleTrainModel = async () => {
    if (effectiveUserId) {
      await trainModel(effectiveUserId);
      refetchModelInfo();
      refetch();
    }
  };

  const handleGeneratePlan = async (
    startDate: string,
    endDate: string,
    targetHours: number
  ) => {
    if (effectiveUserId) {
      await generatePlan(effectiveUserId, startDate, endDate, targetHours);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Please log in to view forecasting</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Productivity Forecasting</h1>
          <p className="text-gray-400">AI-powered predictions and planning for the next 7 days</p>
        </div>
        <div className="flex gap-3">
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={forecastLoading}
            aria-label="Select forecast duration"
          >
            <option value={3}>3 Days</option>
            <option value={7}>7 Days</option>
          </select>
          <button
            onClick={refetch}
            disabled={forecastLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {forecastLoading ? 'Refreshing...' : 'Refresh Forecast'}
          </button>
        </div>
      </div>

      {/* Model Status */}
      <ModelStatus
        modelInfo={modelInfo}
        isLoading={modelInfoLoading}
        isTraining={isTraining}
        trainingResult={trainingResult}
        trainingError={trainingError}
        onTrain={handleTrainModel}
      />

      {/* Prediction Confidence Indicator */}
      {!forecastLoading && !forecastError && forecast?.confidence && (
        <div className={`rounded-lg p-4 border ${
          forecast.confidence.confidence_level === 'high' 
            ? 'bg-green-900/20 border-green-700'
            : forecast.confidence.confidence_level === 'medium'
            ? 'bg-blue-900/20 border-blue-700'
            : forecast.confidence.confidence_level === 'fair'
            ? 'bg-yellow-900/20 border-yellow-700'
            : 'bg-red-900/20 border-red-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">
              {forecast.confidence.confidence_level === 'high' && '🎯'}
              {forecast.confidence.confidence_level === 'medium' && '📊'}
              {forecast.confidence.confidence_level === 'fair' && '⚠️'}
              {forecast.confidence.confidence_level === 'low' && '📉'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Prediction Confidence</h3>
                <span className={`text-sm font-bold px-3 py-1 rounded ${
                  forecast.confidence.confidence_level === 'high'
                    ? 'bg-green-700 text-green-100'
                    : forecast.confidence.confidence_level === 'medium'
                    ? 'bg-blue-700 text-blue-100'
                    : forecast.confidence.confidence_level === 'fair'
                    ? 'bg-yellow-700 text-yellow-100'
                    : 'bg-red-700 text-red-100'
                }`}>
                  {forecast.confidence.confidence_level.toUpperCase()} ({(forecast.confidence.overall_confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                {forecast.confidence.explanation}
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-gray-400">Data Points</div>
                  <div className="text-white font-semibold">
                    {forecast.confidence.factors.data_points} days
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-gray-400">Pattern Stability</div>
                  <div className="text-white font-semibold">
                    {((forecast.confidence.factors.pattern_stability || 0) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="text-gray-400">Data Quality</div>
                  <div className="text-white font-semibold capitalize">
                    {forecast.confidence.data_quality}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Charts */}
      {forecastError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Error loading forecast: {forecastError}</p>
        </div>
      )}

      {forecastLoading && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading forecast...</p>
        </div>
      )}

      {!forecastLoading && !forecastError && forecast?.predictions && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">7-Day Forecast</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ForecastChart
              title="Focus Streak"
              data={forecast.predictions}
              dataKey="focus_streak_longest_global"
              color="#10b981"
              unit="minutes"
            />
            <ForecastChart
              title="File Switch Rate"
              data={forecast.predictions}
              dataKey="file_switch_avg_rate"
              color="#f59e0b"
              unit="switches/min"
            />
            <ForecastChart
              title="Edit Rate"
              data={forecast.predictions}
              dataKey="edits_avg_rate"
              color="#8b5cf6"
              unit="edits/min"
            />
            <ForecastChart
              title="Diagnostic Density"
              data={forecast.predictions}
              dataKey="diagnostics_avg_density"
              color="#ef4444"
              unit="issues/kloc"
            />
            <ForecastChart
              title="Errors Resolved"
              data={forecast.predictions}
              dataKey="errors_resolved"
              color="#14b8a6"
              unit="errors"
            />
            <ForecastChart
              title="Commits"
              data={forecast.predictions}
              dataKey="commits_count"
              color="#06b6d4"
              unit="commits"
            />
            <ForecastChart
              title="Idle/Distraction Time"
              data={forecast.predictions}
              dataKey="idle_distraction_time"
              color="#ec4899"
              unit="minutes"
            />
          </div>
        </div>
      )}

      {/* Plan Generator */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Plan Generator</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlanGeneratorForm
            onGenerate={handleGeneratePlan}
            isGenerating={isGenerating}
            error={planError}
          />
          {plan && <PlanResultsView plan={plan} onClose={reset} />}
        </div>
        
        {/* Early Warnings - Show right after the plan */}
        {plan?.warnings && plan.warnings.length > 0 && (
          <EarlyWarnings warnings={plan.warnings} />
        )}
      </div>
    </div>
  );
};

export default ForecastingDashboard;
