# Phase 2: Hourly Time Scheduling Implementation

## ✅ Implementation Complete

### Overview
Transformed daily hour totals into **detailed hourly time-block schedules** that match specific task types to optimal productivity windows based on historical patterns.

---

## 🎯 What Changed

### Backend Changes

#### 1. **Enhanced TimePatternService** (`packages/ml-service/services/time_pattern_service.py`)

**New Method: `get_hourly_productivity_scores()`**
- Analyzes `focus_streaks` table by hour of day and weekday
- Calculates productivity score (0.0-1.0) for each hour
- Scoring algorithm:
  - 40% weight: Total focus time (frequency)
  - 40% weight: Average session length (quality)
  - 20% weight: Session consistency (reliability)
- Interpolates missing hours from adjacent data
- Returns: `{9: 0.85, 10: 0.92, 11: 0.78, ...}`

**Example Query**:
```sql
SELECT 
    EXTRACT(HOUR FROM start_ts) AS hour,
    AVG(duration_min) AS avg_focus,
    COUNT(*) AS session_count,
    SUM(duration_min) AS total_focus
FROM focus_streaks
WHERE user_id = ? AND EXTRACT(DOW FROM start_ts) = ? 
    AND start_ts >= NOW() - INTERVAL '60 days'
GROUP BY hour
```

**New Method: `classify_time_slot_quality()`**
- Converts productivity score to quality label
- `score >= 0.75` → **"peak"** 🔥
- `score >= 0.55` → **"high"** ⚡
- `score >= 0.35` → **"moderate"** 📊
- `score < 0.35` → **"low"** ⏸️

---

#### 2. **New Function: `_generate_hourly_schedule()`** (`packages/ml-service/services/plan_service.py`)

**Task Taxonomy Defined**:
```python
[
    {
        'name': 'Deep Work (Feature Development)',
        'duration': 2.0,  # 2 hours
        'min_productivity': 0.65,  # Needs high productivity
        'color': 'blue',
        'icon': '🎯'
    },
    {
        'name': 'Code Review & Refactoring',
        'duration': 1.0,
        'min_productivity': 0.50,
        'color': 'green',
        'icon': '🔍'
    },
    {
        'name': 'Testing & Debugging',
        'duration': 1.5,
        'min_productivity': 0.45,
        'color': 'yellow',
        'icon': '🐛'
    },
    {
        'name': 'Documentation',
        'duration': 1.0,
        'min_productivity': 0.40,
        'color': 'purple',
        'icon': '📝'
    },
    {
        'name': 'Meetings & Planning',
        'duration': 0.5,
        'min_productivity': 0.20,
        'color': 'gray',
        'icon': '💬'
    }
]
```

**Scheduling Algorithm**:
1. Get hourly productivity scores for target date
2. Create time slots within user's work hours
3. Sort slots by productivity (best first)
4. Allocate tasks to best-matching time slots
5. Return chronological schedule

**Example Output**:
```json
[
  {
    "start_hour": 9,
    "end_hour": 11,
    "time_range": "9am-11am",
    "task_name": "Deep Work (Feature Development)",
    "duration": 2.0,
    "productivity_score": 0.87,
    "quality_level": "peak",
    "task_color": "blue",
    "task_icon": "🎯",
    "reasoning": "High focus required • Score: 0.87"
  },
  {
    "start_hour": 14,
    "end_hour": 15,
    "time_range": "2pm-3pm",
    "task_name": "Code Review & Refactoring",
    "duration": 1.0,
    "productivity_score": 0.62,
    "quality_level": "high",
    "task_color": "green",
    "task_icon": "🔍",
    "reasoning": "Moderate focus • Score: 0.62"
  }
]
```

**Integration**:
- Called from `_allocate_hours_smart()` for each day
- Receives `work_profile` to determine work hours
- Generates schedule respecting `allocated_hours` limit

---

### Frontend Changes

#### 1. **TypeScript Interface Update** (`mlForecasting.types.ts`)

**Added to DailySchedule**:
```typescript
hourly_schedule?: Array<{
  start_hour: number;
  end_hour: number;
  time_range: string;
  task_name: string;
  duration: number;
  productivity_score: number;
  quality_level: 'peak' | 'high' | 'moderate' | 'low';
  task_color: string;
  task_icon: string;
  reasoning: string;
}>;
```

---

#### 2. **UI Component** (`PlanResultsView.tsx`)

**New Hourly Schedule Section**:
- Displays after "Predicted Performance" metrics
- Shows before "Task Recommendations"
- Visual features:
  - **Color-coded task blocks** (blue/green/yellow/purple/gray)
  - **Quality badges** (PEAK/HIGH/MOD/LOW)
  - **Task icons** (🎯🔍🐛📝💬)
  - **Time ranges** (9am-11am format)
  - **Duration display** (2.0h)
  - **Hover effects** for interaction

**Visual Design**:
```tsx
⏰ Hourly Schedule:

[Blue Border] 🎯 9am-11am [PEAK] 2.0h
              Deep Work (Feature Development)
              High focus required • Score: 0.87

[Green Border] 🔍 2pm-3pm [HIGH] 1.0h
               Code Review & Refactoring
               Moderate focus • Score: 0.62

[Yellow Border] 🐛 4pm-5:30pm [MOD] 1.5h
                Testing & Debugging
                Moderate focus • Score: 0.54
```

---

## 🔬 How It Works

### Data Flow

```
User generates plan
    ↓
For each day:
    1. Get hourly productivity scores from focus_streaks
       (Query by hour + weekday for pattern matching)
    ↓
    2. Create time slots (e.g., 9am-5pm based on work_profile)
    ↓
    3. Sort slots by productivity score
    ↓
    4. Allocate tasks to best-matching slots:
       - Deep Work → Peak hours (score >= 0.65)
       - Code Review → High hours (score >= 0.50)
       - Testing → Moderate hours (score >= 0.45)
       - Documentation → Low-moderate (score >= 0.40)
       - Meetings → Any time (score >= 0.20)
    ↓
    5. Return chronological schedule with time blocks
    ↓
Display in UI with color-coded visual schedule
```

---

## 📊 Impact Examples

### Before Phase 2
**User sees:**
- "Monday: 7.5h recommended"
- "Focus on complex tasks"
- Generic advice, no specific timing

### After Phase 2
**User sees:**
```
Monday: 7.5h recommended

⏰ Hourly Schedule:
🎯 9am-11am (2h) - Deep Work [PEAK]
   Focus predicted: 0.87 • Your most productive time

🔍 11am-12pm (1h) - Code Review [HIGH]
   Good focus for detailed work • Score: 0.68

🍽️ 12pm-1pm - Lunch Break

🐛 2pm-3:30pm (1.5h) - Testing & Debugging [MOD]
   Post-lunch moderate productivity • Score: 0.52

📝 3:30pm-4:30pm (1h) - Documentation [MOD]
   Decent focus for writing • Score: 0.48

💬 4:30pm-5pm (0.5h) - Team Sync [LOW]
   End-of-day meeting slot • Score: 0.35
```

**Value Delivered**:
- ✅ Specific time blocks, not vague suggestions
- ✅ Tasks matched to YOUR productivity patterns
- ✅ Visual schedule you can follow
- ✅ Data-driven reasoning for each block

---

## 🎨 UI Features

### Color Coding System
- 🟦 **Blue** → Deep Work (critical focus tasks)
- 🟩 **Green** → Code Review (detailed analysis)
- 🟨 **Yellow** → Testing (systematic work)
- 🟪 **Purple** → Documentation (writing tasks)
- ⬜ **Gray** → Meetings (flexible timing)

### Quality Badges
- 🟢 **PEAK** → Score 0.75+ (your absolute best hours)
- 🔵 **HIGH** → Score 0.55-0.74 (strong productivity)
- 🟡 **MOD** → Score 0.35-0.54 (decent productivity)
- ⚪ **LOW** → Score <0.35 (save for low-focus tasks)

### Interactive Elements
- Hover effect on time blocks
- Expandable reasoning tooltips
- Visual separation between tasks

---

## 🧪 Testing

### 1. Backend Test
```python
# Test hourly productivity scores
from services.time_pattern_service import TimePatternService
from datetime import datetime

service = TimePatternService()
scores = service.get_hourly_productivity_scores(
    'test_user', 
    datetime(2026, 1, 27),  # Next Monday
    days_history=60
)
print(scores)
# Expected: {0: 0.1, 1: 0.1, ..., 9: 0.85, 10: 0.92, ...}
```

### 2. Schedule Generation Test
```python
# Test hourly schedule creation
from services.plan_service import PlanService

service = PlanService()
plan = service.generate_plan(
    user_id='test_user',
    start_date='2026-01-27',
    end_date='2026-02-02',
    target_hours=35
)

# Check daily_schedule[0].hourly_schedule exists
print(plan['daily_schedule'][0]['hourly_schedule'])
```

### 3. Frontend Test
1. Generate a plan in UI
2. Expand daily schedule
3. Verify "⏰ Hourly Schedule:" section appears
4. Check color-coded time blocks display
5. Verify quality badges (PEAK/HIGH/MOD/LOW)

---

## 🔗 Integration with Phase 1

Phase 2 builds directly on Phase 1:
- Uses `work_profile.typical_start_hour` and `typical_end_hour` to determine work window
- Respects `allocated_hours` calculated from dynamic capacity
- Schedules within user's actual work pattern times

**Example**:
- Phase 1: "User typically works 7h/day from 9am-4pm"
- Phase 2: "Schedule tasks between 9am-4pm, prioritize 9-11am for deep work"

---

## 📁 Files Modified

1. ✏️ [packages/ml-service/services/time_pattern_service.py](packages/ml-service/services/time_pattern_service.py#L193-L298)
   - Added `get_hourly_productivity_scores()` method
   - Added `classify_time_slot_quality()` helper

2. ✏️ [packages/ml-service/services/plan_service.py](packages/ml-service/services/plan_service.py#L403-L550)
   - Added `_generate_hourly_schedule()` method
   - Added `_format_hour()` helper
   - Updated `_allocate_hours_smart()` to generate hourly schedules
   - Integrated hourly_schedule into day_info output

3. ✏️ [packages/dashboard/src/types/ML-Forecasting/mlForecasting.types.ts](packages/dashboard/src/types/ML-Forecasting/mlForecasting.types.ts#L23-L60)
   - Added `hourly_schedule` array to `DailySchedule` interface

4. ✏️ [packages/dashboard/src/pages/Forecasting/PlanResultsView.tsx](packages/dashboard/src/pages/Forecasting/PlanResultsView.tsx#L223-L273)
   - Added Hourly Schedule visualization section
   - Color-coded time blocks with quality badges
   - Task icons and productivity scores

---

## 🎯 Key Achievements

### Intelligent Task Matching
❌ **Before**: "Do 7h of work today"  
✅ **After**: "9-11am: Deep work (peak focus) → 2-3pm: Code review (high focus) → 4-5pm: Meetings (low focus)"

### Productivity-Aware Scheduling
- Deep Work allocated to peak hours (score >= 0.65)
- Code Review to high hours (score >= 0.50)
- Meetings to low hours (score >= 0.20)
- All based on YOUR historical patterns

### Visual Time Management
- See your entire day at a glance
- Color-coded for quick scanning
- Specific time blocks, not vague suggestions

---

## 🚀 What's Next?

**Phase 3** (Ready to implement): **Chart-to-Plan Visual Integration**
- Prediction confidence scores
- Visual flow: "Prediction → Reasoning → Recommendation"
- Tooltips explaining why each task was scheduled at that time
- Interactive "What if?" scenarios

Would you like me to start Phase 3?

---

**Implementation Date**: January 23, 2026  
**Status**: ✅ Complete & Ready for Testing  
**Time to Implement**: ~45 minutes
