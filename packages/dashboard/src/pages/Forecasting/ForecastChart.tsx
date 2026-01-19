import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ForecastPrediction } from '../../types/ML-Forecasting/mlForecasting.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ForecastChartProps {
  title: string;
  data: ForecastPrediction[];
  dataKey: string;
  color: string;
  unit?: string;
}

const ForecastChart: React.FC<ForecastChartProps> = ({ title, data, dataKey, color, unit = '' }) => {
  // Transform data for Chart.js
  const chartData = data.map((item) => {
    const value = item[dataKey];
    const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Handle confidence intervals if available
    const lowerKey = `${dataKey}_lower`;
    const upperKey = `${dataKey}_upper`;
    
    return {
      date,
      value: typeof value === 'number' ? Number(value.toFixed(2)) : value,
      lower: item[lowerKey] ? Number(item[lowerKey].toFixed(2)) : undefined,
      upper: item[upperKey] ? Number(item[upperKey].toFixed(2)) : undefined,
    };
  });

  const hasConfidenceInterval = chartData.some((d) => d.lower !== undefined && d.upper !== undefined);

  const chartJsData = {
    labels: chartData.map((d) => d.date),
    datasets: [
      ...(hasConfidenceInterval
        ? [
            {
              label: 'Confidence Range',
              data: chartData.map((d) => (d.upper !== undefined && d.lower !== undefined ? [d.lower, d.upper] : null)),
              backgroundColor: `${color}33`,
              borderColor: 'transparent',
              fill: true,
              pointRadius: 0,
              tension: 0.4,
            },
          ]
        : []),
      {
        label: `Predicted ${unit}`,
        data: chartData.map((d) => d.value),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#9ca3af',
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (context: any) => `${context.parsed.y?.toFixed(2)} ${unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#374151',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: '#374151',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div style={{ height: '300px' }}>
        <Line data={chartJsData} options={options} />
      </div>
    </div>
  );
};

export default ForecastChart;
