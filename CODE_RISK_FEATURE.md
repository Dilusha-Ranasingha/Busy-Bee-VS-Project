# Code Risk Visualization + AI Guidance

An intelligent code quality monitoring system that detects problematic files and provides AI-powered guidance for fixing errors.

## Overview

This feature uses event-triggered analysis to identify high-risk code files and provides actionable insights through Google's Gemini AI. Unlike traditional static analysis tools that run continuously, this system activates only when errors appear, making it lightweight and highly relevant.

## How It Works

### 1. Trigger Conditions

Analysis is triggered when:
- **Errors appear** in the VS Code Problems/Diagnostics panel
- **Build fails** (VS Code task build failure)

### 2. Error Session Logic

**Session Start:**
- When the first error appears in a file, an error session starts
- The system begins tracking errors for that specific file

**Session Updates:**
- If another error occurs within **1 minute** in the same file, it's added to the count
- The 1-minute timer resets with each new error

**Session End:**
- If **no new errors appear for 1 minute**, the session ends
- Data is collected and sent to Gemini for analysis

### 3. Data Collection (Per File)

At session end, the system collects:
- **File URI** and metadata (language, LOC)
- **Error count** during the session
- **Error messages** from VS Code diagnostics
- **Recent edits** from last 15 minutes (insertions + deletions)
- **Session timing** (start and end timestamps)

### 4. AI Analysis (Gemini)

The collected data is sent to Google's Gemini API with:

**Input:**
```json
{
  "file_uri": "string",
  "loc": number,
  "error_count_session": number,
  "insertions_15m": number,
  "deletions_15m": number,
  "all_error_messages": ["string"],
  "session_start_time": "ISO_TIMESTAMP",
  "session_end_time": "ISO_TIMESTAMP"
}
```

**Output:**
```json
{
  "risk_level": "Low|Medium|High",
  "color_code": "Green|Yellow|Red",
  "risk_explanation": "string",
  "error_explanation": "string",
  "fix_steps": ["string"]
}
```

### 5. Live Display

Results are displayed in the **Code Risk** section of the dashboard with:
- ✅ **Color-coded risk indicators** (🟢 Green, 🟡 Yellow, 🔴 Red)
- ✅ **Risk level** (Low, Medium, High)
- ✅ **Clear explanations** of why the file is risky
- ✅ **Error explanations** (what's happening and why)
- ✅ **Step-by-step fix guidance**
- ✅ **Auto-update** when errors change (30-second refresh)
- ✅ **Auto-dismiss** when file errors are resolved

## Example Scenario

```
File: UserController.ts

8:00:00 AM - 1 error appears
  → Session starts for UserController.ts
  → Error count: 1

8:00:40 AM - 2 more errors appear
  → Session updates (within 1 minute)
  → Error count: 3

8:01:40 AM - No new errors for 1 minute
  → Session ends
  → Collect: file URI, 3 errors, 150 LOC, 45 insertions, 12 deletions
  → Send to Gemini API
  → Receive: High Risk (Red), explanation + fix steps
  → Display in Code Risk dashboard

8:04:00 AM - 2 new errors appear
  → New session starts
  → Error count: 2

8:04:50 AM - 3 more errors
  → Session updates
  → Error count: 5

8:05:50 AM - No new errors for 1 minute
  → Session ends
  → New analysis requested
  → Dashboard updates with latest risk assessment
```

## Database Schema

### Table 1: `error_sessions`
Stores session data sent to Gemini:
- `session_id`, `file_uri`, `user_id`
- `loc`, `error_count_session`
- `insertions_15m`, `deletions_15m`
- `all_error_messages` (JSONB)
- `session_start_time`, `session_end_time`
- `sent_to_gemini`, `gemini_requested_at`

### Table 2: `gemini_risk_results`
Stores AI analysis results for display:
- `result_id`, `session_id`, `error_session_id`
- `file_uri`, `user_id`
- `risk_level`, `color_code`
- `risk_explanation`, `error_explanation`
- `fix_steps` (JSONB)
- `is_active`, `created_at`

## Key Features

### ✅ Event-Triggered Analysis
Only runs when errors actually occur - no continuous overhead

### ✅ File-Level Intelligence
Analyzes specific problematic files, not entire projects

### ✅ Burst Detection
Smart 1-minute windowing captures error "bursts" without premature session endings

### ✅ Contextual Risk Scoring
Uses three signals:
1. **Error count** (real problems)
2. **Recent edits** (developer activity/instability)
3. **LOC** (file complexity)

### ✅ Real-Time Updates
- Auto-refresh every 30 seconds
- Sessions update live as errors change
- Results disappear when errors are fixed

### ✅ AI-Powered Guidance
Google Gemini provides:
- Risk level assessment
- Plain-English explanations
- Actionable fix steps

## API Endpoints

### Error Sessions
```
POST   /api/code-risk/error-sessions
GET    /api/code-risk/error-sessions/user/:userId
GET    /api/code-risk/error-sessions/file?fileUri=...
GET    /api/code-risk/error-sessions/user/:userId/recent
GET    /api/code-risk/error-sessions/pending
```

### Risk Results
```
POST   /api/code-risk/risk-results/from-session/:errorSessionId
GET    /api/code-risk/risk-results/user/:userId/active
GET    /api/code-risk/risk-results/user/:userId/file?fileUri=...
GET    /api/code-risk/risk-results/user/:userId
POST   /api/code-risk/risk-results/user/:userId/deactivate-file
POST   /api/code-risk/risk-results/:id/deactivate
```

## Configuration

### Environment Variables

Add to `packages/backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

### Extension Settings

The Error Session Tracker automatically starts when:
- User is authenticated
- VS Code workspace is open

No manual configuration needed!

## Usage

1. **Install & Build**
   ```bash
   # Backend
   cd packages/backend
   npm install
   npm run dev
   
   # Dashboard
   cd packages/dashboard
   npm install
   npm run dev
   
   # Extension
   cd packages/extension
   npm install
   npm run compile
   # Press F5 to launch extension
   ```

2. **Authenticate**
   - Sign in with GitHub in the dashboard
   - Extension will automatically start tracking

3. **Write Code**
   - When errors appear, sessions automatically start
   - After 1 minute of no new errors, analysis runs
   - Check the "Code Risk" tab in dashboard for results

4. **Fix Issues**
   - Follow the AI-provided fix steps
   - Risk indicators update as errors are resolved
   - Cards automatically disappear when errors are fixed

## Why This Approach is Novel

### 🎯 Traditional Tools
- Run on file save or continuously
- Analyze entire codebase
- Generic, context-free warnings

### 🚀 This System
- Runs only when real errors occur
- Analyzes only problematic files
- Context-aware, AI-powered guidance
- Tracks developer behavior patterns
- Lightweight and event-driven

## Troubleshooting

### No risks showing up?
- Ensure you're authenticated
- Check for errors in VS Code Problems panel
- Verify backend is running on port 4000
- Check browser console for API errors

### Gemini API errors?
- Verify your API key is correct in `.env`
- Check API quota at Google Cloud Console
- Review backend logs for detailed error messages

### Sessions not ending?
- Sessions end after 1 minute of no new errors
- Check extension output channel for logs
- Verify diagnostics are being detected

## Future Enhancements

- [ ] Custom risk thresholds per project
- [ ] Historical risk trends over time
- [ ] Integration with Git commit history
- [ ] Team-wide risk aggregation
- [ ] VS Code inline risk indicators
- [ ] One-click fix application

## License

MIT

---

**Built with:** TypeScript, React, Node.js, PostgreSQL, VS Code Extension API, Google Gemini AI
