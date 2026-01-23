import React from 'react';
import { Level } from '../types/gamification';
import { Check, Lock } from 'lucide-react';

interface LevelRoadmapProps {
  levels: Level[];
  currentLevel: number;
}

export const LevelRoadmap: React.FC<LevelRoadmapProps> = ({ levels, currentLevel }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Level Roadmap</h2>
      
      <div className="space-y-4">
        {levels.map((level, index) => {
          const isUnlocked = level.level <= currentLevel;
          const isCurrent = level.level === currentLevel;
          const isNext = level.level === currentLevel + 1;

          return (
            <div
              key={level.level}
              className={`
                relative flex items-center gap-4 p-4 rounded-lg transition-all duration-300
                ${isCurrent ? 'bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-500 scale-105' : ''}
                ${isUnlocked && !isCurrent ? 'bg-gray-50 border border-gray-200' : ''}
                ${!isUnlocked ? 'bg-gray-100 opacity-60 border border-gray-300' : ''}
                ${isNext ? 'ring-2 ring-orange-400 ring-offset-2' : ''}
              `}
            >
              {/* Level Number & Icon */}
              <div className={`
                flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                ${isUnlocked 
                  ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg' 
                  : 'bg-gray-300 text-gray-500'}
                ${isCurrent ? 'ring-4 ring-primary-300 animate-pulse-slow' : ''}
              `}>
                {isUnlocked ? (
                  <span>{level.icon}</span>
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>

              {/* Level Info */}
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-lg ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                    Level {level.level}: {level.name}
                  </h3>
                  {isUnlocked && !isCurrent && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {isCurrent && (
                    <span className="px-2 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">
                      CURRENT
                    </span>
                  )}
                  {isNext && (
                    <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                      NEXT
                    </span>
                  )}
                </div>
                
                <div className={`text-sm mt-1 ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                  <p>Required XP: {level.xpRequired.toLocaleString()}</p>
                  {level.xpToNext > 0 && (
                    <p className="text-xs">Next: {level.xpToNext.toLocaleString()} XP more</p>
                  )}
                </div>

                {/* Rewards */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {level.rewards.map((reward, idx) => (
                    <span
                      key={idx}
                      className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${isUnlocked 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-200 text-gray-500'}
                      `}
                    >
                      🎁 {reward}
                    </span>
                  ))}
                </div>
              </div>

              {/* Connection Line */}
              {index < levels.length - 1 && (
                <div className={`
                  absolute left-8 top-full w-0.5 h-4 -mt-0
                  ${level.level < currentLevel ? 'bg-primary-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
