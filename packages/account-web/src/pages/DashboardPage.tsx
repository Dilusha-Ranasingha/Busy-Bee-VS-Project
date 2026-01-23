import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Settings, Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { 
  GitCommit, 
  Edit3, 
  Flame, 
  ArrowLeftRight, 
  Clock, 
  Save,
  AlertTriangle,
  FileCode,
  CheckCircle2
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { ActivityHeatmapComponent } from '../components/ActivityHeatmap';
import { ActivityGraph } from '../components/ActivityGraph';
import { mockMetrics, generateActivityHeatmap } from '../data/metricsData';

type TimeRange = 'daily' | 'weekly' | 'monthly';
type ActivityView = 'graph' | 'heatmap';

export const DashboardPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [activityView, setActivityView] = useState<ActivityView>('graph');
  const [metrics, setMetrics] = useState(mockMetrics);
  
  const activityData = useMemo(() => generateActivityHeatmap(), []);

  // Simulate live updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prevMetrics => {
        const newMetrics = { ...prevMetrics };
        // Randomly update one metric to simulate live data
        const metricsKeys = Object.keys(newMetrics) as (keyof typeof newMetrics)[];
        const randomKey = metricsKeys[Math.floor(Math.random() * metricsKeys.length)];
        const metric = newMetrics[randomKey];
        
        if (metric && 'live' in metric) {
          const change = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
          metric.live = {
            ...metric.live,
            current: Math.max(0, metric.live.current + Math.floor(Math.random() * 3 - 1)),
            change: parseFloat(change.toFixed(1)),
            trend: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
          };
        }
        
        return newMetrics;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Get data based on time range
  const getMetricData = (metricHistory: any) => {
    return metricHistory[timeRange];
  };

  const totalActivity = useMemo(() => {
    return activityData.reduce((sum, day) => sum + day.count, 0);
  }, [activityData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-vscode-bg-dark transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-vscode-sidebarBg-dark shadow-sm border-b border-vscode-border-light dark:border-vscode-border-dark sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vscode-accent-light to-blue-600 dark:from-vscode-accent-dark dark:to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  B
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-vscode-text-light dark:text-vscode-text-dark">Busy-Bee</h1>
                  <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">Metrics Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-vscode-textMuted-light dark:text-vscode-textMuted-dark" />
                ) : (
                  <Sun className="w-5 h-5 text-vscode-textMuted-light dark:text-vscode-textMuted-dark" />
                )}
              </button>
              
              {/* Settings */}
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-vscode-textMuted-light dark:text-vscode-textMuted-dark" />
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-3 border-l border-vscode-border-light dark:border-vscode-border-dark">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-vscode-text-light dark:text-vscode-text-dark">Developer</p>
                  <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">
                    <span className="inline-flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active
                    </span>
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                  D
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-vscode-sidebarBg-dark border border-vscode-border-light dark:border-vscode-border-dark rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">Total Focus Time</p>
              <Flame className="w-4 h-4 text-orange-500 opacity-30" />
            </div>
            <p className="text-2xl font-bold text-vscode-text-light dark:text-vscode-text-dark">
              {metrics.focusStreaks.totalFocusHours}h
            </p>
            <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark mt-1">
              Last 30 days
            </p>
          </div>

          <div className="bg-white dark:bg-vscode-sidebarBg-dark border border-vscode-border-light dark:border-vscode-border-dark rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">Avg Session Duration</p>
              <Clock className="w-4 h-4 text-purple-500 opacity-30" />
            </div>
            <p className="text-2xl font-bold text-vscode-text-light dark:text-vscode-text-dark">
              {metrics.editSessions.avgDuration}m
            </p>
            <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark mt-1">
              Average edit session
            </p>
          </div>

          <div className="bg-white dark:bg-vscode-sidebarBg-dark border border-vscode-border-light dark:border-vscode-border-dark rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">Success Rate</p>
              <CheckCircle2 className="w-4 h-4 text-green-500 opacity-30" />
            </div>
            <p className="text-2xl font-bold text-vscode-text-light dark:text-vscode-text-dark">
              {((metrics.taskRuns.successful / metrics.taskRuns.total) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark mt-1">
              Task completion rate
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="bg-white dark:bg-vscode-sidebarBg-dark border border-vscode-border-light dark:border-vscode-border-dark rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-vscode-accent-light dark:text-vscode-accent-dark" />
              <span className="text-sm font-medium text-vscode-text-light dark:text-vscode-text-dark">View Analytics:</span>
            </div>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeRange === range
                      ? 'bg-vscode-accent-light dark:bg-vscode-accent-dark text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-vscode-text-light dark:text-vscode-text-dark hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
{/*Overview */}
        <div className="bg-white dark:bg-vscode-sidebarBg-dark border border-vscode-border-light dark:border-vscode-border-dark rounded-xl p-4 sm:p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-vscode-accent-light dark:text-vscode-accent-dark" />
              <h2 className="text-base sm:text-lg font-semibold text-vscode-text-light dark:text-vscode-text-dark">
                Daily Productivity Overview
              </h2>
            </div>
            <div className="relative">
              <select
                value={activityView}
                onChange={(e) => setActivityView(e.target.value as ActivityView)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-vscode-text-light dark:text-vscode-text-dark border border-vscode-border-light dark:border-vscode-border-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-vscode-accent-light dark:focus:ring-vscode-accent-dark"
              >
                <option value="graph">Graph View</option>
                <option value="heatmap">Heatmap View</option>
              </select>
            </div>
          </div>
          <div className="w-full">
            {activityView === 'graph' ? (
              <ActivityGraph data={activityData} timeRange={timeRange} />
            ) : (
              <ActivityHeatmapComponent data={activityData} />
            )}
          </div>
          <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark mt-3">
            {totalActivity.toLocaleString()} total productivities in the last 6 months
          </p>
        </div>

        {/* 9 Core Metrics Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-vscode-text-light dark:text-vscode-text-dark">
              Core Development Metrics
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Commit Edit Sessions */}
            <MetricCard
              title="Commit Edit Sessions"
              subtitle="Total commit sessions"
              icon={GitCommit}
              iconColor="#3b82f6"
              live={metrics.commitEditSessions.live}
              data={getMetricData(metrics.commitEditSessions.history)}
            />

            {/* 2. Edit Sessions */}
            <MetricCard
              title="Edit Sessions"
              subtitle="Active coding sessions"
              icon={Edit3}
              iconColor="#a855f7"
              live={metrics.editSessions.live}
              data={getMetricData(metrics.editSessions.history)}
            />

            {/* 3. Focus Streaks */}
            <MetricCard
              title="Focus Streak"
              subtitle={`Longest: ${metrics.focusStreaks.longestStreak} days`}
              icon={Flame}
              iconColor="#f97316"
              live={metrics.focusStreaks.live}
              data={getMetricData(metrics.focusStreaks.history)}
              unit=" days"
            />

            {/* 4. File Switches */}
            <MetricCard
              title="File Switches"
              subtitle="Navigation patterns"
              icon={ArrowLeftRight}
              iconColor="#06b6d4"
              live={metrics.fileSwitches.live}
              data={getMetricData(metrics.fileSwitches.history)}
            />

            {/* 5. Error Fix Time */}
            <MetricCard
              title="Avg Error Fix Time"
              subtitle={`${metrics.errorFixTime.totalFixed} errors fixed`}
              icon={AlertTriangle}
              iconColor="#ef4444"
              live={metrics.errorFixTime.live}
              data={getMetricData(metrics.errorFixTime.history)}
              unit=" min"
              format={(val) => val.toFixed(1)}
            />

            {/* 6. Save Edit Sessions */}
            <MetricCard
              title="Save Edit Sessions"
              subtitle="File save patterns"
              icon={Save}
              iconColor="#10b981"
              live={metrics.saveEditSessions.live}
              data={getMetricData(metrics.saveEditSessions.history)}
            />

            {/* 7. Idle Sessions */}
            <MetricCard
              title="Idle Sessions"
              subtitle={`${Math.floor(metrics.idleSessions.totalIdleMinutes / 60)}h total idle`}
              icon={Clock}
              iconColor="#eab308"
              live={metrics.idleSessions.live}
              data={getMetricData(metrics.idleSessions.history)}
            />

            {/* 8. Diagnostic Density */}
            <MetricCard
              title="Diagnostic Density"
              subtitle="Errors per line of code"
              icon={FileCode}
              iconColor="#ec4899"
              live={metrics.diagnosticDensity.live}
              data={getMetricData(metrics.diagnosticDensity.history)}
              format={(val) => val.toFixed(3)}
            />

            {/* 9. Task Runs */}
            <MetricCard
              title="Task Runs"
              subtitle={`${metrics.taskRuns.successful} successful`}
              icon={CheckCircle2}
              iconColor="#8b5cf6"
              live={metrics.taskRuns.live}
              data={getMetricData(metrics.taskRuns.history)}
            />
          </div>
        </div>

      </main>
    </div>
  );
};
