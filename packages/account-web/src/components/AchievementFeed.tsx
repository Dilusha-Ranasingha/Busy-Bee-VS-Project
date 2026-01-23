import React from 'react';
import { Achievement } from '../types/gamification';
import { Award, Clock } from 'lucide-react';

interface AchievementFeedProps {
  achievements: Achievement[];
}

export const AchievementFeed: React.FC<AchievementFeedProps> = ({ achievements }) => {
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <div className="bg-white dark:bg-vscode-sidebarBg-dark rounded-xl shadow-lg p-6 border border-vscode-border-light dark:border-vscode-border-dark">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-5 h-5 text-vscode-accent-light dark:text-vscode-accent-dark" />
        <h2 className="text-xl font-semibold text-vscode-text-light dark:text-vscode-text-dark">Recent Activity</h2>
      </div>

      <div className="space-y-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-vscode-border-light dark:border-vscode-border-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-sm">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="flex-grow min-w-0">
              <h3 className="font-medium text-sm text-vscode-text-light dark:text-vscode-text-dark mb-1">{achievement.title}</h3>
              <p className="text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark mb-2">{achievement.description}</p>
              <div className="flex items-center gap-1.5 text-xs text-vscode-textMuted-light dark:text-vscode-textMuted-dark">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(achievement.earnedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-8 text-vscode-textMuted-light dark:text-vscode-textMuted-dark">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No recent achievements</p>
        </div>
      )}
    </div>
  );
};
