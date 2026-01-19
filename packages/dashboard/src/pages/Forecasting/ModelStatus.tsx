import React from 'react';
import type { ModelInfo, TrainingResponse } from '../../types/ML-Forecasting/mlForecasting.types';

interface ModelStatusProps {
  modelInfo: ModelInfo | null;
  isLoading: boolean;
  isTraining: boolean;
  trainingResult: TrainingResponse | null;
  trainingError: string | null;
  onTrain: () => void;
}

const ModelStatus: React.FC<ModelStatusProps> = ({
  modelInfo,
  isLoading,
  isTraining,
  trainingResult,
  trainingError,
  onTrain,
}) => {
  const getModelStatus = () => {
    if (isLoading) return { color: 'text-gray-400', icon: '⏳', text: 'Loading...' };
    if (!modelInfo?.model_exists) return { color: 'text-red-400', icon: '❌', text: 'Not Trained' };
    return { color: 'text-green-400', icon: '✓', text: 'Ready' };
  };

  const status = getModelStatus();

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-white">ML Model Status</h3>
              <p className={`text-sm ${status.color}`}>{status.text}</p>
            </div>
          </div>
          
          {modelInfo?.last_trained && (
            <div className="text-sm text-gray-400 ml-8">
              Last trained:{' '}
              {new Date(modelInfo.last_trained).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        <button
          onClick={onTrain}
          disabled={isTraining}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isTraining ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Training...
            </>
          ) : (
            <>
              <span>🎓</span>
              {modelInfo?.model_exists ? 'Retrain Model' : 'Train Model'}
            </>
          )}
        </button>
      </div>

      {/* Training Result */}
      {trainingResult && (
        <div className="mt-4 bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-green-400 text-sm">
            ✓ Model trained successfully on {trainingResult.training_samples} samples
          </p>
          {trainingResult.metrics && (
            <div className="mt-2 text-xs text-gray-400">
              Version: {trainingResult.model_version}
            </div>
          )}
        </div>
      )}

      {/* Training Error */}
      {trainingError && (
        <div className="mt-4 bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400 text-sm">Error: {trainingError}</p>
        </div>
      )}

      {/* Model Info */}
      {!modelInfo?.model_exists && !isTraining && (
        <div className="mt-4 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            ℹ️ Train the model first to start making predictions. This will analyze your historical
            productivity data and create personalized forecasts.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelStatus;
