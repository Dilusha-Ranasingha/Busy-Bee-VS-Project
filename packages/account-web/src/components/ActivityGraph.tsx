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
import { ActivityHeatmap } from '../types/metrics';

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

interface ActivityGraphProps {
  data: ActivityHeatmap[];
  timeRange: 'daily' | 'weekly' | 'monthly';
}

export const ActivityGraph: React.FC<ActivityGraphProps> = ({ data, timeRange }) => {
  // Group data based on time range
  const chartData = React.useMemo(() => {
    if (timeRange === 'daily') {
      // Show last 30 days
      const last30Days = data.slice(-30);
      return {
        labels: last30Days.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        values: last30Days.map(d => d.count),
        label: 'Daily Activity',
      };
    } else if (timeRange === 'weekly') {
      // Group by weeks
      const weeks: { week: string; count: number }[] = [];
      let currentWeek: ActivityHeatmap[] = [];
      let weekIndex = 0;

      data.forEach((day, index) => {
        currentWeek.push(day);
        
        if ((index + 1) % 7 === 0 || index === data.length - 1) {
          const totalCount = currentWeek.reduce((sum, d) => sum + d.count, 0);
          weeks.push({
            week: `Week ${weekIndex + 1}`,
            count: totalCount,
          });
          currentWeek = [];
          weekIndex++;
        }
      });

      return {
        labels: weeks.map(w => w.week),
        values: weeks.map(w => w.count),
        label: 'Weekly Activity',
      };
    } else {
      // Group by months
      const monthlyMap = new Map<string, number>();
      data.forEach(d => {
        const monthKey = new Date(d.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + d.count);
      });

      const months = Array.from(monthlyMap.entries());
      return {
        labels: months.map(([month]) => month),
        values: months.map(([, count]) => count),
        label: 'Monthly Activity',
      };
    }
  }, [data, timeRange]);

  const graphData = {
    labels: chartData.labels,
    datasets: [
      {
        label: chartData.label,
        data: chartData.values,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#10b981',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y} projectivity`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
          display: true,
        },
        ticks: {
          color: 'var(--vscode-foreground)',
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
        },
        ticks: {
          color: 'var(--vscode-foreground)',
          font: { size: 11 },
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="w-full">
      <div className="h-64">
        <Line data={graphData} options={chartOptions} />
      </div>
    </div>
  );
};
