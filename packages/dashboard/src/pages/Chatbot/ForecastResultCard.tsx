import React from 'react';
import type { ForecastData } from '../../types/ML-Forecasting/chatbot.types';

interface ForecastResultCardProps {
  data: ForecastData;
}

const ForecastResultCard: React.FC<ForecastResultCardProps> = ({ data }) => {
  const predictions = data.predictions || [];

  // Filter predictions to only show future dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futurePredictions = predictions.filter(p => {
    if (!p.date) return true; // Keep predictions without dates
    const predDate = new Date(p.date);
    predDate.setHours(0, 0, 0, 0);
    return predDate >= today;
  });

  // Filter and normalize predictions
  const validPredictions = futurePredictions
    .filter(
      (p) => p.value !== undefined && p.value !== null && p.kpi
    )
    .slice(0, 5); // Show top 5

  if (validPredictions.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>📊</span>
          Forecast Results
        </h4>
        <p className="text-xs text-gray-400 mt-2">No forecast data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <span>📊</span>
        Forecast Results
      </h4>
      
      <div className="space-y-2">
        {validPredictions.map((prediction, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <div>
                <div className="text-sm text-white capitalize">{prediction.kpi}</div>
                {prediction.date && (
                  <div className="text-xs text-gray-400">
                    {new Date(prediction.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm font-semibold text-blue-400">
              {(Number(prediction.value) || 0).toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {(data.predictions?.length || 0) > 5 && (
        <p className="text-xs text-gray-500 text-center">
          + {((data.predictions?.length || 0) - 5)} more metrics
        </p>
      )}
    </div>
  );
};

export default ForecastResultCard;
