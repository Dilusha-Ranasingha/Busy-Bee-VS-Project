// Metrics Types based on Busy-Bee tracking
export interface MetricDataPoint {
  date: string;
  value: number;
}

export interface LiveMetric {
  current: number;
  change: number; // percentage change
  trend: 'up' | 'down' | 'stable';
}

export interface MetricHistory {
  daily: MetricDataPoint[];
  weekly: MetricDataPoint[];
  monthly: MetricDataPoint[];
}

// 9 Core Metrics from Busy-Bee
export interface DeveloperMetrics {
  // 1. Commit Edit Sessions
  commitEditSessions: {
    live: LiveMetric;
    history: MetricHistory;
    total: number;
    avgDuration: number; // minutes
  };
  
  // 2. Diagnostic Density
  diagnosticDensity: {
    live: LiveMetric;
    history: MetricHistory;
    errorsPerLine: number;
    warningsPerLine: number;
  };
  
  // 3. Edit Sessions
  editSessions: {
    live: LiveMetric;
    history: MetricHistory;
    total: number;
    avgDuration: number; // minutes
  };
  
  // 4. Error Fix Time
  errorFixTime: {
    live: LiveMetric;
    history: MetricHistory;
    avgTimeMinutes: number;
    totalFixed: number;
  };
  
  // 5. Focus Streaks
  focusStreaks: {
    live: LiveMetric;
    history: MetricHistory;
    currentStreak: number;
    longestStreak: number;
    totalFocusHours: number;
  };
  
  // 6. Idle Sessions
  idleSessions: {
    live: LiveMetric;
    history: MetricHistory;
    totalIdleMinutes: number;
    avgIdleDuration: number; // minutes
  };
  
  // 7. Save Edit Sessions
  saveEditSessions: {
    live: LiveMetric;
    history: MetricHistory;
    total: number;
    avgEditsBeforeSave: number;
  };
  
  // 8. File Switches
  fileSwitches: {
    live: LiveMetric;
    history: MetricHistory;
    total: number;
    avgPerSession: number;
  };
  
  // 9. Task Runs
  taskRuns: {
    live: LiveMetric;
    history: MetricHistory;
    successful: number;
    failed: number;
    total: number;
  };
}

export interface ActivityHeatmap {
  date: string;
  count: number;
  level: number; // 0-4
}
