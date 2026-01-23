# Busy-Bee Account Web

A gamified developer account dashboard with badges and levels inspired by Apple Fitness and Clash of Clans.

## Features

### 🏆 Gamification System

- **Badges**: Unlock achievements across 5 categories:
  - 🎯 Coding: Commit milestones and code volume
  - 🔥 Streaks: Consecutive coding days
  - ✨ Quality: Code quality and bug-free periods
  - 💪 Productivity: Focus time and task completion
  - 🤝 Collaboration: Pull requests and reviews

- **Levels**: Progress through 10 levels with unique names and rewards:
  - Level 1: Novice Coder 🌱
  - Level 2: Apprentice 🔰
  - Level 3: Code Warrior ⚔️
  - Level 4: Elite Developer 🏆
  - Level 5: Master Builder 🏗️
  - Level 6: Code Architect 🏛️
  - Level 7: Tech Titan 💎
  - Level 8: Code Legend 👑
  - Level 9: Supreme Hacker 🌟
  - Level 10: Code God ⚡

- **Badge Tiers**: Bronze, Silver, Gold, Platinum, Diamond

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

## Project Structure

```
src/
  components/     # Reusable UI components
    BadgeCard.tsx
    BadgeGrid.tsx
    LevelProgress.tsx
    LevelRoadmap.tsx
    StatsOverview.tsx
    AchievementFeed.tsx
  data/          # Mock data
    mockData.ts
  pages/         # Page components
    DashboardPage.tsx
  types/         # TypeScript types
    gamification.ts
  App.tsx
  main.tsx
  index.css
```

## Features Included

✅ Level progression with XP system
✅ Badge collection with unlock states
✅ Progress tracking for locked badges
✅ Achievement feed with recent unlocks
✅ Comprehensive stats dashboard
✅ Visual level roadmap
✅ Responsive design
✅ Animated UI elements
✅ Mock data for demonstration
