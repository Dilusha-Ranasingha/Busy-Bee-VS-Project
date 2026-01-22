# Phase 1: Dynamic Workday & User Work Profile Implementation

## ✅ Implementation Complete

### Overview
Replaced static 8-hour (480 minute) workday assumption with **dynamic, personalized work capacity** calculated from each user's historical screen time and coding patterns.

---

## 🎯 What Changed

### Backend Changes (`packages/ml-service/services/plan_service.py`)

#### 1. **New Function: `_get_user_work_profile()`**
- **Purpose**: Calculate user's personalized work profile from historical data
- **Data Source**: Queries last 30 days of `daily_metrics.screen_time->>'active_time_min_from_edits'`
- **Calculates**:
  - `avg_workday_minutes`: Average daily active coding time
  - `avg_daily_hours`: Average hours per day
  - `max_daily_hours`: Peak daily hours
  - `stddev_hours`: Variability in work hours
  - `typical_start_hour`: Most common work start time (from `focus_streaks`)
  - `typical_end_hour`: Calculated end time
  - `work_pattern_type`: Classifies as `early_bird`, `night_owl`, or `standard`
  - `days_analyzed`: Number of days with data (requires minimum 10 days)

**Example Output**:
```json
{
  "avg_workday_minutes": 420.5,
  "avg_daily_hours": 7.0,
  "max_daily_hours": 9.5,
  "stddev_hours": 1.2,
  "typical_start_hour": 9,
  "typical_end_hour": 16,
  "work_pattern_type": "standard",
  "days_analyzed": 25
}
```

#### 2. **Updated Function: `_calculate_daily_availability()`**
**BEFORE** (Static):
```python
available = max(0, (480 - idle_time) / 60 * (focus_time / 60))
available = min(available, 10)  # Hard cap at 10 hours
```

**AFTER** (Dynamic):
```python
available = max(0, (user_workday_minutes - idle_time) / 60 * (focus_time / 60))
max_daily_cap = (user_workday_minutes / 60) * 1.2  # Cap at user's max + 20%
available = min(available, max_daily_cap)
```

- Now uses **actual user workday duration** instead of hardcoded 480min
- Cap dynamically adjusts to user's typical max (allows 20% stretch)

#### 3. **Updated: `generate_plan()` Integration**
- Calls `_get_user_work_profile()` before calculating availability
- Passes `work_profile['avg_workday_minutes']` to `_calculate_daily_availability()`
- Includes `work_profile` in plan output

---

### Frontend Changes

#### 1. **TypeScript Interface** (`packages/dashboard/src/types/ML-Forecasting/mlForecasting.types.ts`)

**New Interface**:
```typescript
export interface WorkProfile {
  avg_workday_minutes: number;
  avg_daily_hours: number;
  max_daily_hours: number;
  stddev_hours: number;
  typical_start_hour: number;
  typical_end_hour: number;
  work_pattern_type: 'early_bird' | 'night_owl' | 'standard';
  days_analyzed: number;
}
```

**Updated ProductivityPlan**:
```typescript
export interface ProductivityPlan {
  // ... existing fields
  work_profile?: WorkProfile;  // NEW
}
```

#### 2. **UI Component** (`packages/dashboard/src/pages/Forecasting/PlanResultsView.tsx`)

**New Section**: Work Profile Display Card
- Shows user's personalized work schedule
- Displays average daily hours with variability
- Shows typical work schedule (start/end times)
- Identifies work pattern type (Early Bird, Night Owl, Standard)
- Indicates data source: "Based on X days of your actual screen time"

**Visual Design**:
- Blue/purple gradient background for differentiation
- Icon: 👤 (user profile)
- Two-column grid layout for metrics
- Info icon explaining data source

---

## 🔬 How It Works

### Data Flow

1. **User generates plan** → `generate_plan(user_id, start_date, end_date, target_hours)`

2. **Work Profile Calculation**:
   ```sql
   SELECT AVG(active_time_min_from_edits) 
   FROM daily_metrics 
   WHERE user_id = ? AND date >= last_30_days
   ```

3. **Pattern Analysis**:
   ```sql
   SELECT EXTRACT(HOUR FROM start_time), COUNT(*)
   FROM focus_streaks 
   WHERE user_id = ? 
   GROUP BY hour
   ORDER BY count DESC
   ```

4. **Dynamic Capacity Calculation**:
   - User A works 5h/day average → Predictions capped at 6h/day (5h × 1.2)
   - User B works 9h/day average → Predictions capped at 10.8h/day (9h × 1.2)

5. **Result**: Personalized productivity plan matching user's actual work patterns

---

## 📊 Impact Examples

### Before (Static)
**All Users:**
- Available Hours = (480min - idle) × (focus/60)
- Same 8-hour baseline for everyone
- Developer working 5h/day gets overestimated capacity
- Developer working 10h/day gets underestimated capacity

### After (Dynamic)
**User A** (Part-time: 5h/day average):
- Available Hours = (300min - idle) × (focus/60)
- Cap: 6h/day (5h × 1.2)
- ✅ Realistic capacity matching actual habits

**User B** (Full-time: 9h/day average):
- Available Hours = (540min - idle) × (focus/60)
- Cap: 10.8h/day (9h × 1.2)
- ✅ Recognizes higher capacity without artificial limits

---

## 🛡️ Fallback Behavior

If insufficient data (< 10 days):
```python
{
    'avg_workday_minutes': 360.0,  # 6 hours (conservative)
    'avg_daily_hours': 6.0,
    'max_daily_hours': 8.0,
    'stddev_hours': 1.5,
    'typical_start_hour': 9,
    'typical_end_hour': 17,
    'work_pattern_type': 'standard',
    'days_analyzed': 0
}
```

---

## 🧪 Testing Recommendations

### 1. Test with Synthetic Data
The existing `generate_daily_metrics.sql` includes `active_time_min_from_edits` field:
```sql
SELECT * FROM daily_metrics WHERE user_id = 'test_user' LIMIT 30;
```
Verify screen time data exists.

### 2. Test Work Profile Calculation
```python
from services.plan_service import PlanService
service = PlanService()
profile = service._get_user_work_profile('test_user')
print(profile)
```

### 3. Test Plan Generation
Generate plan and verify:
- `work_profile` appears in response
- `daily_schedule` hours reflect user's actual capacity
- Capacity no longer assumes 8 hours for all users

### 4. UI Verification
- Work Profile card displays below feasibility score
- Shows avg hours, typical schedule, work pattern type
- Days analyzed count is accurate

---

## 📈 Next Steps (Phase 2+)

Phase 1 ✅ Complete: Dynamic workday duration per user

**Phase 2** (Next Priority): Time-of-Day Scheduling
- Hourly schedule generation (not just daily totals)
- Match task types to user's productive hours
- Example: "9-11am: Deep Work (focus peak)" vs "2-3pm: Code Review (low focus)"

**Phase 3**: Chart-to-Plan Integration
- Visual flow from predictions to recommendations
- Prediction confidence scores
- Explain why each recommendation was made

**Phase 4**: Advanced Personalization
- Adaptive targets based on recent trends
- Weekly cycle recognition
- Prediction accuracy tracking

---

## 🎉 Achievement Unlocked

✅ **Truly Personalized Capacity Planning**
- System now adapts to each developer's actual work habits
- No more one-size-fits-all 8-hour assumptions
- Foundation ready for hourly schedule generation (Phase 2)

---

## Files Modified

1. ✏️ `packages/ml-service/services/plan_service.py`
   - Added `_get_user_work_profile()` method
   - Updated `_calculate_daily_availability()` signature and logic
   - Modified `generate_plan()` to include work profile

2. ✏️ `packages/dashboard/src/types/ML-Forecasting/mlForecasting.types.ts`
   - Added `WorkProfile` interface
   - Updated `ProductivityPlan` interface

3. ✏️ `packages/dashboard/src/pages/Forecasting/PlanResultsView.tsx`
   - Added Work Profile display section
   - Styled with gradient background for visual separation

---

**Implementation Date**: January 23, 2026  
**Status**: ✅ Complete & Ready for Testing
