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
  Filler
} from 'chart.js';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { LiveMetric, MetricDataPoint } from '../types/metrics';

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

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  live: LiveMetric;
  data: MetricDataPoint[];
  unit?: string;
  subtitle?: string;
  format?: (value: number) => string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon: Icon,
  iconColor,
  live,
  data,
  unit = '',
  subtitle,
  format = (val) => val.toLocaleString(),
}) => {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        data: data.map(d => d.value),
        borderColor: iconColor,
        backgroundColor: `${iconColor}20`,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: iconColor,
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${format(context.parsed.y)}${unit}`,
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const getTrendIcon = () => {
    if (live.trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (live.trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (live.trend === 'up') return 'text-green-500 dark:text-green-400';
    if (live.trend === 'down') return 'text-red-500 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="border border-vscode-border-light dark:border-vscode-border-dark rounded-lg p-4 bg-white dark:bg-vscode-sidebarBg-dark hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg opacity-20`} style={{ backgroundColor: iconColor }}>
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">{title}</p>
            {subtitle && (
              <p className="text-[10px] text-vscode-textMuted-light dark:text-vscode-textMuted-dark opacity-60">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Live Indicator */}
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-vscode-textMuted-light dark:text-vscode-textMuted-dark">LIVE</span>
        </div>
      </div>

      {/* Value & Change */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-vscode-text-light dark:text-vscode-text-dark">
            {format(live.current)}
            <span className="text-sm font-normal text-vscode-textMuted-light dark:text-vscode-textMuted-dark ml-1">{unit}</span>
          </p>
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-xs font-semibold">{Math.abs(live.change).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-16">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};
