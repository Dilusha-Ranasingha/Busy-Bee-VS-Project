import React from 'react';
import { UserStats } from '../types/gamification';
import { Code2, Flame, Clock, CheckCircle2, Target, TrendingUp, Users, FileCode } from 'lucide-react';

interface StatsOverviewProps {
  stats: UserStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const statCards = [
    {
      icon: <Code2 className="w-5 h-5" />,
      label: 'Total Commits',
      value: stats.totalCommits.toLocaleString(),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: <Flame className="w-5 h-5" />,
      label: 'Current Streak',
      value: `${stats.currentStreak} days`,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      subtitle: `Best: ${stats.longestStreak} days`
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Focus Hours',
      value: stats.focusHours.toLocaleString(),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      label: 'Tasks Completed',
      value: stats.tasksCompleted.toLocaleString(),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Code Quality',
      value: `${stats.codeQualityScore}%`,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Productivity',
      value: `${stats.productivityScore}%`,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Collaboration',
      value: `${stats.collaborationScore}%`,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      icon: <FileCode className="w-5 h-5" />,
      label: 'Lines of Code',
      value: stats.totalCodeLines.toLocaleString(),
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg p-5 transition-all duration-200 hover:shadow-md border border-vscode-border-light dark:border-vscode-border-dark`}
        >
          <div className={`inline-flex p-2.5 rounded-lg ${card.color} mb-3`}>
            {card.icon}
          </div>
          <h3 className="text-vscode-textMuted-light dark:text-vscode-textMuted-dark text-xs font-medium mb-1">{card.label}</h3>
          <p className="text-2xl font-semibold text-vscode-text-light dark:text-vscode-text-dark mb-0.5">{card.value}</p>
          {card.subtitle && (
            <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
};
