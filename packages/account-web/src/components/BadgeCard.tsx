import React, { useState } from 'react';
import { Badge as BadgeType } from '../types/gamification';
import { Lock, CheckCircle2, Sparkles } from 'lucide-react';

interface BadgeCardProps {
  badge: BadgeType;
  onClick?: () => void;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-600 via-amber-500 to-amber-700';
      case 'silver': return 'from-gray-300 via-gray-100 to-gray-400';
      case 'gold': return 'from-yellow-400 via-yellow-300 to-yellow-500';
      case 'platinum': return 'from-purple-400 via-purple-300 to-purple-500';
      case 'diamond': return 'from-cyan-400 via-blue-300 to-cyan-500';
      default: return 'from-gray-300 to-gray-400';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return '#d97706';
      case 'silver': return '#9ca3af';
      case 'gold': return '#f59e0b';
      case 'platinum': return '#a855f7';
      case 'diamond': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group cursor-pointer"
    >
      {/* Card Container */}
      <div className={`
        relative overflow-hidden rounded-2xl p-6 transition-all duration-500
        ${badge.unlocked 
          ? 'bg-white dark:bg-vscode-sidebarBg-dark shadow-lg hover:shadow-xl' 
          : 'bg-gray-50 dark:bg-gray-900/50 opacity-70'}
        border border-vscode-border-light dark:border-vscode-border-dark
        ${isHovered && badge.unlocked ? 'scale-105 -translate-y-1' : ''}
      `}>
        
        {/* Unlocked Badge - Animated Circle with Icon */}
        <div className="flex justify-center mb-4">
          <div className={`
            relative w-32 h-32 rounded-full flex items-center justify-center
            transition-all duration-700
            ${badge.unlocked 
              ? `bg-gradient-to-br ${getTierGradient(badge.tier)} animate-scale-in` 
              : 'bg-gray-200 dark:bg-gray-700'}
          `}
          style={{
            boxShadow: badge.unlocked && isHovered 
              ? `0 0 40px ${getTierColor(badge.tier)}40, 0 0 80px ${getTierColor(badge.tier)}20` 
              : badge.unlocked 
              ? `0 0 20px ${getTierColor(badge.tier)}30`
              : 'none'
          }}>
            
            {/* Shine effect on hover - Apple Fitness style */}
            {badge.unlocked && isHovered && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-shine" />
              </div>
            )}

            {/* Icon or Lock */}
            <div className={`
              relative z-10 text-6xl transition-all duration-500
              ${badge.unlocked ? '' : 'filter grayscale opacity-40'}
            `}>
              {badge.unlocked ? (
                <span className={isHovered ? 'animate-float' : ''}>{badge.icon}</span>
              ) : (
                <Lock className="w-12 h-12 text-gray-400 dark:text-gray-600" />
              )}
            </div>

            {/* Sparkle effect for unlocked badges */}
            {badge.unlocked && isHovered && (
              <Sparkles className="absolute top-2 right-2 w-6 h-6 text-white animate-pulse" />
            )}
          </div>
        </div>

        {/* Badge Name */}
        <h3 className={`
          text-center font-semibold text-lg mb-2 transition-colors
          ${badge.unlocked 
            ? 'text-vscode-text-light dark:text-vscode-text-dark' 
            : 'text-gray-400 dark:text-gray-600'}
        `}>
          {badge.name}
        </h3>

        {/* Badge Description */}
        <p className={`
          text-center text-sm mb-4 min-h-[40px]
          ${badge.unlocked 
            ? 'text-vscode-textMuted-light dark:text-vscode-textMuted-dark' 
            : 'text-gray-400 dark:text-gray-600'}
        `}>
          {badge.description}
        </p>

        {/* Progress Bar (for locked badges) */}
        {!badge.unlocked && (
          <div className="space-y-2 mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${getTierGradient(badge.tier)} transition-all duration-700`}
                style={{ width: `${badge.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
              <span>{badge.currentValue.toLocaleString()} / {badge.requiredValue.toLocaleString()}</span>
              <span>{badge.progress}%</span>
            </div>
          </div>
        )}

        {/* Unlocked Checkmark and Date */}
        {badge.unlocked && (
          <div className="space-y-2">
            <div className="flex justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
            {badge.unlockedAt && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                {new Date(badge.unlockedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {/* Tier Badge - Top Right */}
        <div className={`
          absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold
          bg-gradient-to-r ${getTierGradient(badge.tier)}
          ${badge.unlocked ? 'text-white shadow-md' : 'text-white/60'}
        `}>
          {badge.tier.toUpperCase()}
        </div>
      </div>
    </div>
  );
};
