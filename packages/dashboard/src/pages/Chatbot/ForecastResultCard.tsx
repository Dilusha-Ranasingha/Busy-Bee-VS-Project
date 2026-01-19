import React from 'react';
import type { ForecastData } from '../../types/ML-Forecasting/chatbot.types';

interface ForecastResultCardProps {
  data: ForecastData;
}

const ForecastResultCard: React.FC<ForecastResultCardProps> = ({ data }) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      case 'stable':
        return 'text-yellow-400';
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <span>📊</span>
        Forecast Results
      </h4>
      
      <div className="space-y-2">
        {data.predictions.slice(0, 5).map((prediction, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{getTrendIcon(prediction.trend)}</span>
              <div>
                <div className="text-sm text-white">{prediction.kpi}</div>
                <div className="text-xs text-gray-400">
                  {new Date(prediction.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
            <div className={`text-sm font-semibold ${getTrendColor(prediction.trend)}`}>
              {prediction.value.toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {data.predictions.length > 5 && (
        <p className="text-xs text-gray-500 text-center">
          + {data.predictions.length - 5} more predictions
        </p>
      )}
    </div>
  );
};

export default ForecastResultCard;
