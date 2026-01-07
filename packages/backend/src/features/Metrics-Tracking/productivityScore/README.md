# AI Productivity Scoring System

Automatic daily productivity scoring using Google's Gemini AI that runs after daily metrics aggregation.

## Overview

At **23:59 Asia/Colombo** each day, the system:
1. ✅ Aggregates metrics → Creates `daily_metrics` record
2. ✅ Sends metrics to Gemini AI → Gets productivity score (0-100) + recommendations
3. ✅ Saves to `productivity_score` table

## Workflow

```
Extension Tracks → Raw Metrics Tables → [23:59 Cron] → Daily Metrics → Gemini AI → Productivity Score
                    (9 tables)                         (JSONB)        (Analysis)   (Score + Tips)
```

## Database Schema

### Table: `productivity_score`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `user_id` | TEXT NOT NULL | GitHub user ID |
| `date` | DATE NOT NULL | The day (YYYY-MM-DD) |
| `score` | INTEGER NOT NULL | Productivity score 0-100 |
| `recommendations` | JSONB NOT NULL | Array of recommendation strings |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Constraints:**
- `UNIQUE (user_id, date)` - One score per user per day
- `CHECK (score >= 0 AND score <= 100)` - Valid score range

## AI Scoring Logic

### Scoring Criteria (Gemini Prompt)

**File Switch Rate:**
- ≤1.5/min = Good (low context switching)
- \>3/min = Poor (excessive switching)

**Focus Streaks:**
- ≥30min = Excellent (deep work)
- <10min = Needs improvement

**Edits per Minute:**
- 10-20 = Good pace
- <5 = Slow
- \>30 = Rushed/paste-heavy

**Save-to-Edit Ratio:**
- 0.03-0.08 = Balanced
- Too low = Risky
- Too high = Over-cautious

**Diagnostics per KLOC:**
- ≤5 = Clean code
- \>10 = Quality issues

**Error Fix Time:**
- Median <3min = Good debugging skills
- \>5min = Needs improvement

**Task Runs:**
- Pass rate ≥70% = Good
- <50% = Serious issues

**Commits:**
- 3-8/day ideal
- ≤50 edits/commit = Good granularity
- 1+ commits/hour peak = Active

**Idle Time:**
- <60min/day = Focused
- \>120min = Distracted

### AI Response Format

```json
{
  "score": 78,
  "recommendations": [
    "Clear the diagnostics hotspot first; aim ≤5 problems/KLOC.",
    "Raise test pass rate to ≥70% by running focused tests.",
    "Commit smaller chunks: 1–3 commits/hour, ≤70 lines each."
  ]
}
```

## Automatic Execution

### Cron Schedule
- **Time:** 23:59 Asia/Colombo
- **Frequency:** Daily
- **Timezone:** Asia/Colombo

### Execution Order
1. Run `make_daily_metrics_all(date)` → Creates JSONB metrics
2. Run `runDailyScoringForAllUsers(date)` → AI scoring
3. Both complete automatically

### Logs
```
[DailyMetrics] Running daily aggregation for 2026-01-06...
[DailyMetrics] Daily aggregation completed for 2026-01-06
[DailyMetrics] Starting productivity scoring for 2026-01-06...
[DailyScoring] Found 3 users to score for 2026-01-06
[DailyScoring] Generating score for user u123 on 2026-01-06...
[DailyScoring] Score saved for user u123: 78/100 with 3 recommendations
[DailyMetrics] ✅ All daily processing completed for 2026-01-06
```

## API Endpoints

### GET `/api/productivity-score?userId=xxx&date=2026-01-06`
Get productivity score for specific user and date.

**Response:**
```json
{
  "id": 1,
  "userId": "u123",
  "date": "2026-01-06",
  "score": 78,
  "recommendations": [
    "Clear the diagnostics hotspot first; aim ≤5 problems/KLOC.",
    "Raise test pass rate to ≥70% by running focused tests.",
    "Commit smaller chunks: 1–3 commits/hour, ≤70 lines each."
  ],
  "createdAt": "2026-01-07T00:01:23.456Z"
}
```

### GET `/api/productivity-score/range?userId=xxx&startDate=2026-01-01&endDate=2026-01-07`
Get productivity scores for date range (for charts/trends).

**Response:**
```json
[
  {
    "id": 7,
    "userId": "u123",
    "date": "2026-01-07",
    "score": 82,
    "recommendations": ["..."],
    "createdAt": "2026-01-08T00:01:15.789Z"
  },
  {
    "id": 6,
    "userId": "u123",
    "date": "2026-01-06",
    "score": 78,
    "recommendations": ["..."],
    "createdAt": "2026-01-07T00:01:23.456Z"
  }
]
```

### POST `/api/daily-metrics/trigger`
Manually trigger aggregation + scoring (testing/backfilling).

**Body:**
```json
{
  "date": "2026-01-06",
  "userId": "u123",  // Optional - omit for all users
  "includeScoring": true  // Default: true
}
```

**Response:**
```json
{
  "message": "Aggregation + scoring triggered for user u123 on 2026-01-06"
}
```

## Fallback Scoring

If Gemini API fails (network issues, rate limits, invalid API key), the system uses **local heuristic scoring**:

```typescript
Base score: 50

File switch ≤1.5/min:     +10
Focus ≥30min:             +15
Diagnostics ≤5/KLOC:      +15
Pass rate ≥70%:           +10
Good commit habits:       +10
High idle time (>120min): -10

Final: Clamped to 0-100
```

Recommendations generated based on failing criteria.

## Environment Setup

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env`:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 2. Install Dependencies
```bash
cd packages/backend
npm install @google/generative-ai
```

### 3. Apply Database Migration
```bash
docker-compose down -v
docker-compose up -d
```

## Testing

### Manual Trigger (Today's Data)
```bash
curl -X POST http://localhost:4000/api/daily-metrics/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-06",
    "includeScoring": true
  }'
```

### Check Score
```bash
curl "http://localhost:4000/api/productivity-score?userId=161825980&date=2026-01-06"
```

### Test Without AI (Metrics Only)
```bash
curl -X POST http://localhost:4000/api/daily-metrics/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-06",
    "includeScoring": false
  }'
```

## Error Handling

**Gemini API Failure:**
- ✅ Fallback to heuristic scoring
- ✅ Logs error but continues
- ✅ Score still saved

**Missing Metrics:**
- ⚠️ Skips user (no metrics = no score)
- ✅ Logs warning
- ✅ Continues with other users

**Individual User Failure:**
- ⚠️ Logs error for that user
- ✅ Continues scoring other users
- ✅ Can retry failed user manually

## Rate Limiting

**Gemini API Limits:**
- Free tier: 60 requests/minute
- For >60 users, implement batching with delays:

```typescript
// In dailyScoring.ts, add delay between users
await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
```

## Dashboard Integration

Display score on dashboard:

```typescript
// Fetch today's score
const score = await productivityScoreService.getScore(userId, '2026-01-06');

// Show in UI
<Card>
  <h3>Today's Productivity Score</h3>
  <div className="score">{score.score}/100</div>
  <ul>
    {score.recommendations.map(rec => (
      <li key={rec}>{rec}</li>
    ))}
  </ul>
</Card>
```

## Query Examples

### Get all scores for a user
```sql
SELECT date, score, recommendations
FROM productivity_score
WHERE user_id = 'u123'
ORDER BY date DESC
LIMIT 30;
```

### Find days with low scores
```sql
SELECT user_id, date, score
FROM productivity_score
WHERE score < 50
ORDER BY date DESC;
```

### Get recommendation frequency
```sql
SELECT 
  jsonb_array_elements_text(recommendations) as recommendation,
  COUNT(*) as frequency
FROM productivity_score
WHERE user_id = 'u123'
GROUP BY recommendation
ORDER BY frequency DESC;
```

## Customization

### Adjust Scoring Weights
Edit [`packages/backend/src/ai/gemini.ts`](packages/backend/src/ai/gemini.ts:14-43) prompt to change criteria weights.

### Change AI Model
```typescript
// Use Gemini Pro 1.5 instead
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
```

### Add More Recommendations
Modify prompt to request 5-10 recommendations instead of 3-5.
