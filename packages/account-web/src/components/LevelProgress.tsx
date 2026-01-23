import React from 'react';
import { Level, UserProgress } from '../types/gamification';
import { TrendingUp } from 'lucide-react';

interface LevelProgressProps {
  userProgress: UserProgress;
  levels: Level[];
}

export const LevelProgress: React.FC<LevelProgressProps> = ({ userProgress, levels }) => {
  const currentLevel = levels.find(l => l.level === userProgress.currentLevel);
  const nextLevel = levels.find(l => l.level === userProgress.currentLevel + 1);

  if (!currentLevel) return null;

  return (
    <div className="bg-white dark:bg-vscode-sidebarBg-dark rounded-xl p-8 shadow-lg border border-vscode-border-light dark:border-vscode-border-dark">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-vscode-accent-light dark:bg-vscode-accent-dark rounded-lg p-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-vscode-text-light dark:text-vscode-text-dark">{currentLevel.name}</h2>
            <p className="text-vscode-textMuted-light dark:text-vscode-textMuted-dark">Level {currentLevel.level}</p>
          </div>
        </div>
        <div className="text-5xl">
          {currentLevel.icon}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-vscode-text-light dark:text-vscode-text-dark">{userProgress.currentXP.toLocaleString()} XP</span>
          {nextLevel && (
            <span className="text-vscode-textMuted-light dark:text-vscode-textMuted-dark">
              {nextLevel.xpRequired.toLocaleString()} XP needed
            </span>
          )}
        </div>
        <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-vscode-accent-light to-blue-500 dark:from-vscode-accent-dark dark:to-blue-600 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${userProgress.levelProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">
          <span>Progress to Level {userProgress.currentLevel + 1}</span>
          <span className="font-semibold text-vscode-accent-light dark:text-vscode-accent-dark">{userProgress.levelProgress}%</span>
        </div>
      </div>

      {/* Current Level Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-vscode-border-light dark:border-vscode-border-dark">
        <h3 className="font-medium mb-3 text-vscode-text-light dark:text-vscode-text-dark text-sm">
          Current Level Benefits
        </h3>
        <div className="flex flex-wrap gap-2">
          {currentLevel.rewards.map((reward, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-white dark:bg-gray-700 rounded-md text-xs font-medium text-vscode-text-light dark:text-vscode-text-dark border border-vscode-border-light dark:border-vscode-border-dark"
            >
              {reward}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
