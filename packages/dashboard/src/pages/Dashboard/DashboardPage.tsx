import { useMemo } from 'react';
import {
  GitCommit,
  Edit3,
  Flame,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  Code,
  Activity
} from 'lucide-react';

// Mock data generator
const generateMockActivityData = () => {
  const weeks = 26; // ~6 months
  const data: { date: string; count: number; level: number }[] = [];
  const today = new Date();
  
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.floor(Math.random() * 30);
    const level = count === 0 ? 0 : count < 5 ? 1 : count < 10 ? 2 : count < 20 ? 3 : 4;
    data.push({
      date: date.toISOString().split('T')[0],
      count,
      level
    });
  }
  return data;
};

const ContributionHeatmap = ({ data }: { data: { date: string; count: number; level: number }[] }) => {
  const weeks = useMemo(() => {
    const weekMap: Record<string, { date: string; count: number; level: number }[]> = {};
    data.forEach(day => {
      const date = new Date(day.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = [];
      weekMap[key].push(day);
    });
    return Object.values(weekMap);
  }, [data]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-vscode-editor-bg border-vscode-panel-border';
      case 1: return 'bg-green-500 bg-opacity-20 border-green-500';
      case 2: return 'bg-green-500 bg-opacity-40 border-green-500';
      case 3: return 'bg-green-500 bg-opacity-60 border-green-500';
      case 4: return 'bg-green-500 bg-opacity-80 border-green-500';
      default: return 'bg-vscode-editor-bg border-vscode-panel-border';
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-0.5">
            {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
              const day = week[dayIdx];
              return (
                <div
                  key={dayIdx}
                  className={`w-2.5 h-2.5 border rounded-sm ${day ? getLevelColor(day.level) : 'bg-vscode-editor-bg border-vscode-panel-border'}`}
                  title={day ? `${day.date}: ${day.count} activities` : ''}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const activityData = useMemo(() => generateMockActivityData(), []);
  
  const stats = useMemo(() => {
    const totalActivities = activityData.reduce((sum, day) => sum + day.count, 0);
    const avgPerDay = Math.round(totalActivities / activityData.length);
    const currentStreak = activityData.slice(-7).filter(d => d.count > 0).length;
    const longestStreak = 12; // Mock data
    
    return {
      totalActivities,
      avgPerDay,
      currentStreak,
      longestStreak,
      commits: 47,
      edits: 1234,
      focusMinutes: 3420,
      fileSwitches: 892
    };
  }, [activityData]);

  return (
    <div className="space-y-4">
      {/* Activity Heatmap */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="text-brand-primary" size={20} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">Daily Activity</h2>
        </div>
        <div className="mb-3">
          <ContributionHeatmap data={activityData} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-vscode-descriptionForeground">
            {stats.totalActivities} activities in the last 6 months
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-vscode-descriptionForeground">Less</span>
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`w-2.5 h-2.5 border rounded-sm ${
                    level === 0 ? 'bg-vscode-editor-bg border-vscode-panel-border' :
                    level === 1 ? 'bg-green-500 bg-opacity-20 border-green-500' :
                    level === 2 ? 'bg-green-500 bg-opacity-40 border-green-500' :
                    level === 3 ? 'bg-green-500 bg-opacity-60 border-green-500' :
                    'bg-green-500 bg-opacity-80 border-green-500'
                  }`}
                />
              ))}
            </div>
            <span className="text-vscode-descriptionForeground">More</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Commits */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Commits</p>
            <GitCommit className="text-brand-primary opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">{stats.commits}</p>
          <p className="text-xs text-vscode-descriptionForeground mt-1">Last 30 days</p>
        </div>

        {/* Edits */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Edits</p>
            <Edit3 className="text-purple-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">{stats.edits}</p>
          <p className="text-xs text-vscode-descriptionForeground mt-1">Last 30 days</p>
        </div>

        {/* Focus Time */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">Focus Time</p>
            <Flame className="text-orange-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">{Math.floor(stats.focusMinutes / 60)}h</p>
          <p className="text-xs text-vscode-descriptionForeground mt-1">Last 30 days</p>
        </div>

        {/* File Switches */}
        <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-widget-bg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-vscode-foreground opacity-75">File Switches</p>
            <ArrowLeftRight className="text-blue-500 opacity-30" size={16} />
          </div>
          <p className="text-2xl font-bold text-vscode-editor-fg">{stats.fileSwitches}</p>
          <p className="text-xs text-vscode-descriptionForeground mt-1">Last 30 days</p>
        </div>
      </div>

      {/* Streaks */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="text-orange-500" size={20} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">Productivity Streaks</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <p className="text-xs text-vscode-foreground opacity-75 mb-1">Current Streak</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-orange-500">{stats.currentStreak}</p>
              <p className="text-xs text-vscode-descriptionForeground">days</p>
            </div>
          </div>
          <div className="border border-vscode-panel-border rounded-lg p-3 bg-vscode-editor-bg">
            <p className="text-xs text-vscode-foreground opacity-75 mb-1">Longest Streak</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-green-500">{stats.longestStreak}</p>
              <p className="text-xs text-vscode-descriptionForeground">days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="border border-vscode-panel-border rounded-xl p-4 bg-vscode-widget-bg">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="text-green-500" size={20} />
          <h2 className="text-base font-semibold text-vscode-editor-fg">Weekly Summary</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
            <div className="flex items-center gap-2">
              <Code className="text-brand-primary" size={16} />
              <span className="text-xs text-vscode-foreground">Code Quality</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="text-green-500" size={14} />
              <span className="text-xs font-semibold text-vscode-editor-fg">92%</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
            <div className="flex items-center gap-2">
              <Clock className="text-brand-primary" size={16} />
              <span className="text-xs text-vscode-foreground">Avg. Session</span>
            </div>
            <span className="text-xs font-semibold text-vscode-editor-fg">2h 15m</span>
          </div>
          <div className="flex items-center justify-between p-2 border border-vscode-panel-border rounded bg-vscode-editor-bg">
            <div className="flex items-center gap-2">
              <Activity className="text-brand-primary" size={16} />
              <span className="text-xs text-vscode-foreground">Daily Avg.</span>
            </div>
            <span className="text-xs font-semibold text-vscode-editor-fg">{stats.avgPerDay} activities</span>
          </div>
        </div>
      </div>
    </div>
  );
}
