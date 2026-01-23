// Badge Types
export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'coding' | 'streak' | 'quality' | 'productivity' | 'collaboration';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon: string;
  requirement: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number; // 0-100
  requiredValue: number;
  currentValue: number;
}

// Level System (Clash of Clans style)
export interface Level {
  level: number;
  name: string;
  xpRequired: number;
  xpToNext: number;
  rewards: string[];
  icon: string;
}

export interface UserProgress {
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  nextLevelXP: number;
  levelProgress: number; // percentage
}

// User Stats
export interface UserStats {
  totalCommits: number;
  totalCodeLines: number;
  currentStreak: number;
  longestStreak: number;
  focusHours: number;
  tasksCompleted: number;
  codeQualityScore: number;
  productivityScore: number;
  collaborationScore: number;
}

// Achievements
export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  badgeId: string;
}
