# Daily Metrics System

Automatic daily aggregation of all metrics into JSONB summary records.

## Overview

The daily metrics system automatically aggregates data from all 9 metric trackers into a single `daily_metrics` table at 23:59 Asia/Colombo time each day. Each user gets one record per day with JSONB columns containing structured metric data.

## Database Schema

### Table: `daily_metrics`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT | GitHub user ID |
| `date` | DATE | The day (YYYY-MM-DD) |
| `file_switch` | JSONB | File switching metrics |
| `focus_streak` | JSONB | Focus streak metrics |
| `edits_per_min` | JSONB | Editing speed metrics |
| `saves_to_edit_ratio` | JSONB | Save behavior metrics |
| `diagnostics_per_kloc` | JSONB | Code quality metrics |
| `error_fix` | JSONB | Error fixing metrics |
| `tasks` | JSONB | Build/test metrics |
| `commits` | JSONB | Commit cadence metrics |
| `idle` | JSONB | Idle time metrics |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Primary Key:** `(user_id, date)`

## JSONB Structure

### file_switch
```json
{
  "file_switch_rate_avg": 0.9,
  "file_switch_rate_p95": 2.4,
  "file_switch_count_total": 62,
  "file_switch_sessions": 6
}
```

### focus_streak
```json
{
  "global_focus_streak_max_min": 46,
  "per_file_focus_streak_max_min": 29
}
```

### edits_per_min
```json
{
  "edits_per_min_avg": 15.2,
  "edits_per_min_p95": 31.0,
  "typing_burstiness_index_avg": 0.52,
  "paste_events_total": 3,
  "active_time_min_from_edits": 180
}
```

### saves_to_edit_ratio
```json
{
  "save_to_edit_ratio_manual_avg": 0.018,
  "effective_save_to_edit_ratio_avg": 0.041,
  "median_secs_between_saves": 170,
  "checkpoint_autosave_count_total": 4
}
```

### diagnostics_per_kloc
```json
{
  "diagnostics_density_avg_per_kloc": 3.8,
  "diagnostics_hotspot_max_per_kloc": 11.2
}
```

### error_fix
```json
{
  "fixes_count": 6,
  "median_active_fix_time_min": 3.4,
  "min_active_fix_time_min": 1.2
}
```

### tasks
```json
{
  "test_runs": 7,
  "build_runs": 3,
  "overall_pass_rate": 0.72,
  "avg_test_duration_sec": 27
}
```

### commits
```json
{
  "commits_total": 5,
  "median_mins_between_commits": 24,
  "best_commits_in_any_hour": 3,
  "avg_edits_per_commit": 42
}
```

### idle
```json
{
  "idle_time_min_total": 38,
  "idle_sessions_count": 2
}
```

## PostgreSQL Functions

### `make_daily_metrics(p_user_id TEXT, p_day DATE)`
Aggregates one day's metrics for a single user. Idempotent (safe to re-run).

**Example:**
```sql
SELECT make_daily_metrics('u123', '2026-01-06');
```

### `make_daily_metrics_all(p_day DATE)`
Aggregates one day's metrics for all users who have activity.

**Example:**
```sql
SELECT make_daily_metrics_all('2026-01-06');
```

## Automatic Scheduling

The system uses `node-cron` to run aggregation automatically:

- **Schedule:** Every day at 23:59 Asia/Colombo time
- **Timezone:** Asia/Colombo
- **Function Called:** `make_daily_metrics_all(today)`

**Cron Configuration:**
```typescript
cron.schedule('59 23 * * *', async () => {
  // Aggregation logic
}, { timezone: 'Asia/Colombo' });
```

## API Endpoints

### GET `/api/daily-metrics`
Get daily metrics for a specific user and date.

**Query Parameters:**
- `userId` (required): User ID
- `date` (required): Date in YYYY-MM-DD format

**Example:**
```bash
GET /api/daily-metrics?userId=u123&date=2026-01-06
```

**Response:**
```json
{
  "userId": "u123",
  "date": "2026-01-06",
  "fileSwitch": { ... },
  "focusStreak": { ... },
  "editsPerMin": { ... },
  "savesToEditRatio": { ... },
  "diagnosticsPerKloc": { ... },
  "errorFix": { ... },
  "tasks": { ... },
  "commits": { ... },
  "idle": { ... },
  "createdAt": "2026-01-07T00:00:05.123Z"
}
```

### GET `/api/daily-metrics/range`
Get daily metrics for a date range.

**Query Parameters:**
- `userId` (required): User ID
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)

**Example:**
```bash
GET /api/daily-metrics/range?userId=u123&startDate=2026-01-01&endDate=2026-01-07
```

### POST `/api/daily-metrics/trigger`
Manually trigger aggregation (for testing or backfilling).

**Body:**
```json
{
  "date": "2026-01-06",
  "userId": "u123"  // Optional - omit to trigger for all users
}
```

**Example:**
```bash
POST /api/daily-metrics/trigger
Content-Type: application/json

{
  "date": "2026-01-06"
}
```

## Data Aggregation Logic

### Time Windows
All queries filter by `[day 00:00 → next day 00:00)` in the user's timezone.

### Aggregation Methods

| Metric | Method |
|--------|--------|
| File switch rate | AVG, P95 percentile |
| Focus streak | MAX for global and per-file |
| Edits per min | AVG, P95 percentile |
| Save ratio | AVG, MEDIAN |
| Diagnostics | AVG, MAX peak |
| Error fix | COUNT, MEDIAN, MIN duration |
| Tasks | COUNT by type, pass rate |
| Commits | COUNT, MEDIAN gaps, MAX in hour window |
| Idle | SUM duration, COUNT sessions |

### Source Tables

1. **file_switch** ← `file_switch_windows` (by `window_start`)
2. **focus_streak** ← `focus_streaks` (by `start_ts`)
3. **edits_per_min** ← `sessions_edits` (by `start_ts`)
4. **saves_to_edit_ratio** ← `save_edit_sessions` (by `start_ts`)
5. **diagnostics_per_kloc** ← `diagnostic_density_sessions` (by `start_ts`)
6. **error_fix** ← `error_fix_sessions` (by `end_ts`)
7. **tasks** ← `task_runs` (by `start_ts`)
8. **commits** ← `commit_edit_sessions` (by `end_ts`, `aborted=false`)
9. **idle** ← `idle_sessions` (by `start_ts`)

## Installation

### 1. Install Dependencies
```bash
cd packages/backend
npm install node-cron
npm install --save-dev @types/node-cron
```

### 2. Apply Database Migration
```bash
# Reset database with new schema
docker-compose down -v
docker-compose up -d
```

### 3. Start Server
```bash
npm run dev
```

The cron job will automatically start and log:
```
[DailyMetrics] Cron job scheduled: Daily aggregation at 23:59 Asia/Colombo
```

## Testing

### Manual Trigger for Today
```bash
curl -X POST http://localhost:4000/api/daily-metrics/trigger \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-06"}'
```

### Check Results
```bash
curl "http://localhost:4000/api/daily-metrics?userId=u123&date=2026-01-06"
```

### Backfill Historical Data
```bash
# Run for each day
for date in 2026-01-01 2026-01-02 2026-01-03; do
  curl -X POST http://localhost:4000/api/daily-metrics/trigger \
    -H "Content-Type: application/json" \
    -d "{\"date\": \"$date\"}"
done
```

## Notes

- **Idempotent:** Safe to run multiple times for the same day (uses `ON CONFLICT DO UPDATE`)
- **Timezone:** All times are in Asia/Colombo timezone
- **Performance:** Aggregation uses indexed columns for fast queries
- **Storage:** JSONB allows flexible querying with PostgreSQL JSON operators
- **Null Handling:** Missing data returns `null` or `0` depending on metric type

## Querying JSONB in SQL

```sql
-- Get file switch rate for a specific day
SELECT 
  user_id,
  date,
  file_switch->>'file_switch_rate_avg' AS rate
FROM daily_metrics
WHERE user_id = 'u123' AND date = '2026-01-06';

-- Get users with high idle time
SELECT 
  user_id,
  date,
  (idle->>'idle_time_min_total')::numeric AS idle_min
FROM daily_metrics
WHERE date = '2026-01-06'
  AND (idle->>'idle_time_min_total')::numeric > 60
ORDER BY idle_min DESC;
```
