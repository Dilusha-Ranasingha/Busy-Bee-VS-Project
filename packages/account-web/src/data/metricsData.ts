import { DeveloperMetrics, MetricDataPoint, ActivityHeatmap } from '../types/metrics';

// Helper to generate time series data
const generateTimeSeries = (days: number, baseValue: number, variance: number): MetricDataPoint[] => {
  const data: MetricDataPoint[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const value = Math.max(0, baseValue + Math.floor(Math.random() * variance * 2 - variance));
    data.push({
      date: date.toISOString().split('T')[0],
      value,
    });
  }
  return data;
};

// Generate weekly data
const generateWeeklySeries = (weeks: number, baseValue: number, variance: number): MetricDataPoint[] => {
  const data: MetricDataPoint[] = [];
  const today = new Date();
  
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    const value = Math.max(0, baseValue + Math.floor(Math.random() * variance * 2 - variance));
    data.push({
      date: `Week ${weeks - i}`,
      value,
    });
  }
  return data;
};

// Generate monthly data
const generateMonthlySeries = (months: number, baseValue: number, variance: number): MetricDataPoint[] => {
  const data: MetricDataPoint[] = [];
  const today = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const value = Math.max(0, baseValue + Math.floor(Math.random() * variance * 2 - variance));
    data.push({
      date: monthName,
      value,
    });
  }
  return data;
};

// Generate activity heatmap for the last 6 months
export const generateActivityHeatmap = (): ActivityHeatmap[] => {
  const weeks = 26; // ~6 months
  const data: ActivityHeatmap[] = [];
  const today = new Date();
  
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.floor(Math.random() * 30);
    const level = count === 0 ? 0 : count < 5 ? 1 : count < 10 ? 2 : count < 20 ? 3 : 4;
    data.push({
      date: date.toISOString().split('T')[0],
      count,
      level,
    });
  }
  return data;
};

// Mock Metrics Data
export const mockMetrics: DeveloperMetrics = {
  commitEditSessions: {
    live: {
      current: 156,
      change: 12.5,
      trend: 'up',
    },
    history: {
      daily: generateTimeSeries(30, 5, 3),
      weekly: generateWeeklySeries(12, 35, 15),
      monthly: generateMonthlySeries(6, 140, 40),
    },
    total: 156,
    avgDuration: 45,
  },
  
  diagnosticDensity: {
    live: {
      current: 0.012,
      change: -8.3,
      trend: 'down',
    },
    history: {
      daily: generateTimeSeries(30, 0.015, 0.005).map(d => ({ ...d, value: parseFloat(d.value.toFixed(3)) })),
      weekly: generateWeeklySeries(12, 0.015, 0.005).map(d => ({ ...d, value: parseFloat(d.value.toFixed(3)) })),
      monthly: generateMonthlySeries(6, 0.015, 0.005).map(d => ({ ...d, value: parseFloat(d.value.toFixed(3)) })),
    },
    errorsPerLine: 0.012,
    warningsPerLine: 0.018,
  },
  
  editSessions: {
    live: {
      current: 342,
      change: 15.2,
      trend: 'up',
    },
    history: {
      daily: generateTimeSeries(30, 11, 4),
      weekly: generateWeeklySeries(12, 77, 20),
      monthly: generateMonthlySeries(6, 310, 60),
    },
    total: 342,
    avgDuration: 28,
  },
  
  errorFixTime: {
    live: {
      current: 12.5,
      change: -15.8,
      trend: 'down',
    },
    history: {
      daily: generateTimeSeries(30, 15, 8),
      weekly: generateWeeklySeries(12, 15, 8),
      monthly: generateMonthlySeries(6, 15, 8),
    },
    avgTimeMinutes: 12.5,
    totalFixed: 89,
  },
  
  focusStreaks: {
    live: {
      current: 23,
      change: 4.5,
      trend: 'up',
    },
    history: {
      daily: generateTimeSeries(30, 1, 1),
      weekly: generateWeeklySeries(12, 5, 2),
      monthly: generateMonthlySeries(6, 20, 8),
    },
    currentStreak: 23,
    longestStreak: 45,
    totalFocusHours: 234,
  },
  
  idleSessions: {
    live: {
      current: 45,
      change: -12.3,
      trend: 'down',
    },
    history: {
      daily: generateTimeSeries(30, 2, 1),
      weekly: generateWeeklySeries(12, 12, 5),
      monthly: generateMonthlySeries(6, 48, 15),
    },
    totalIdleMinutes: 1250,
    avgIdleDuration: 28,
  },
  
  saveEditSessions: {
    live: {
      current: 278,
      change: 8.7,
      trend: 'up',
    },
    history: {
      daily: generateTimeSeries(30, 9, 4),
      weekly: generateWeeklySeries(12, 63, 18),
      monthly: generateMonthlySeries(6, 252, 50),
    },
    total: 278,
    avgEditsBeforeSave: 15,
  },
  
  fileSwitches: {
    live: {
      current: 4523,
      change: 18.9,
      trend: 'up',
    },
    history: {
      daily: generateTimeSeries(30, 150, 50),
      weekly: generateWeeklySeries(12, 1050, 300),
      monthly: generateMonthlySeries(6, 4200, 800),
    },
    total: 4523,
    avgPerSession: 32,
  },
  
  taskRuns: {
    live: {
      current: 167,
      change: 22.1,
      trend: 'up',
    },
    history: {
      daily: generateTimeSeries(30, 5, 3),
      weekly: generateWeeklySeries(12, 35, 12),
      monthly: generateMonthlySeries(6, 140, 40),
    },
    successful: 142,
    failed: 25,
    total: 167,
  },
};
