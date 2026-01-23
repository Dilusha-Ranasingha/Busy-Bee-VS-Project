import React from 'react';
import { Badge } from '../types/gamification';
import { BadgeCard } from './BadgeCard';
import { Award } from 'lucide-react';

interface BadgeGridProps {
  badges: Badge[];
  onBadgeClick?: (badge: Badge) => void;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges, onBadgeClick }) => {
  const categories = ['all', 'coding', 'streak', 'quality', 'productivity', 'collaboration'] as const;
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(b => b.category === selectedCategory);

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="bg-gradient-to-r from-vscode-accent-light to-blue-600 dark:from-vscode-accent-dark dark:to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Award className="w-7 h-7" />
          <h2 className="text-2xl font-semibold">Achievement Collection</h2>
        </div>
        <p className="text-white/90 text-sm mb-4">
          {unlockedCount} of {badges.length} achievements unlocked · {Math.round((unlockedCount / badges.length) * 100)}% complete
        </p>
        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-yellow-300 to-yellow-400 transition-all duration-500"
            style={{ width: `${(unlockedCount / badges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${selectedCategory === category 
                ? 'bg-vscode-accent-light dark:bg-vscode-accent-dark text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-vscode-text-light dark:text-vscode-text-dark hover:bg-gray-200 dark:hover:bg-gray-700'}
            `}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBadges.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onClick={() => onBadgeClick?.(badge)}
          />
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12 text-vscode-textMuted-light dark:text-vscode-textMuted-dark">
          No achievements found in this category
        </div>
      )}
    </div>
  );
};
