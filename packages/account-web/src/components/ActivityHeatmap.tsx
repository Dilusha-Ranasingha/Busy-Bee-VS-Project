import React, { useMemo } from 'react';
import { ActivityHeatmap } from '../types/metrics';

interface ActivityHeatmapProps {
  data: ActivityHeatmap[];
}

export const ActivityHeatmapComponent: React.FC<ActivityHeatmapProps> = ({ data }) => {
  const weeks = useMemo(() => {
    const weekMap: Record<string, ActivityHeatmap[]> = {};
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
      case 0: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      case 1: return 'bg-green-200 dark:bg-green-900/40 border-green-300 dark:border-green-700';
      case 2: return 'bg-green-400 dark:bg-green-700/60 border-green-500 dark:border-green-600';
      case 3: return 'bg-green-500 dark:bg-green-600/80 border-green-600 dark:border-green-500';
      case 4: return 'bg-green-600 dark:bg-green-500 border-green-700 dark:border-green-400';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="w-full">
      {/* Scrollable Heatmap Container */}
      <div className="overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex gap-1 min-w-max justify-center">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1 flex-shrink-0">
              {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                const day = week[dayIdx];
                return (
                  <div
                    key={dayIdx}
                    className={`w-3 h-3 border rounded-sm transition-all hover:scale-125 cursor-pointer ${
                      day ? getLevelColor(day.level) : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                    title={day ? `${day.date}: ${day.count} activities` : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark flex-wrap">
        <span className="whitespace-nowrap">Less</span>
        <div className="flex gap-1 flex-shrink-0">
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={`w-3 h-3 border rounded-sm ${getLevelColor(level)}`}
            />
          ))}
        </div>
        <span className="whitespace-nowrap">More</span>
      </div>
    </div>
  );
};
