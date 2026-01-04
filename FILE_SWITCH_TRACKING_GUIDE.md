# File Switch Tracking - How It Works

## ✅ What's Implemented

### 1. Backend API (Complete)
- **Database**: `file_switch_windows` table stores 5-minute window data
- **Endpoints**:
  - `POST /api/file-switch/windows` - Extension sends data here
  - `GET /api/file-switch/windows?sessionId=xxx` - Dashboard fetches windows
  - `GET /api/file-switch/sessions?date=YYYY-MM-DD` - Dashboard lists sessions

### 2. Dashboard UI (Complete)
- **Location**: `packages/dashboard/src/pages/FileSwitchRate/`
- **Features**:
  - Date picker to select tracking date
  - Left panel: List of sessions for that date
  - Right panel: 5-minute windows table with activation counts
  - Summary stats: total activations, avg rate/min, start/end times
- **Access**: Click "File Switch" tab in the dashboard

### 3. VS Code Extension Tracking (NOW COMPLETE!)
- **Location**: `packages/extension/src/tracking/FileSwitchTracker.ts`
- **How it works**:
  1. Starts automatically when VS Code opens
  2. Listens for file activations (switches)
  3. Counts EVERY activation (A→B→A = 3 switches)
  4. Every 5 minutes, sends data to backend API
  5. Resets counter and starts new window

## 🧪 How to Test

### Step 1: Start Backend
```bash
cd packages/backend
npm run dev
```
Backend runs on http://localhost:4000

### Step 2: Start Dashboard (for browser testing)
```bash
cd packages/dashboard
npm run dev
```
Dashboard runs on http://localhost:5173

### Step 3: Test Extension with Tracking
1. Press **F5** in VS Code (starts Extension Development Host)
2. New VS Code window opens with extension active
3. **Tracking starts automatically!**

### Step 4: Generate File Switches
In the Extension Development Host window:
1. Open file A (count: 1)
2. Open file B (count: 2)
3. Click back to file A (count: 3)
4. Open file C (count: 4)
5. Switch between files for 5 minutes

### Step 5: See Results
After 5 minutes:
- ✅ You'll see a VS Code notification: "File Switch: X activations in 5 min"
- ✅ Data is saved to database
- ✅ Go to dashboard → "File Switch" tab
- ✅ Select today's date (2025-12-29)
- ✅ See your session listed
- ✅ Click session → see 5-minute windows table

## 📊 Example Flow

```
Time    Action                  Count
00:00   Open file A             1
00:30   Switch to file B        2
01:00   Switch to file C        3
01:30   Back to file A          4  ← Yes, counts again!
02:00   Switch to file B        5
...
05:00   ⏰ 5 minutes elapsed
        → Sends to API: {
            sessionId: "session-1735464000-xyz",
            windowStart: "2025-12-29T00:00:00Z",
            windowEnd: "2025-12-29T00:05:00Z",
            activationCount: 5,
            ratePerMin: 1.0
          }
        → Counter resets to 0
        → New window starts
```

## 🔍 Debug Console Logs

Watch the Debug Console when testing:

```
[FileSwitchTracker] Started tracking session: session-1735464000-xyz
[FileSwitchTracker] Initial file: file:///path/to/file.ts
[FileSwitchTracker] File activated: file:///path/to/another.ts (count: 2)
[FileSwitchTracker] File activated: file:///path/to/file.ts (count: 3)
...
[FileSwitchTracker] Flushing window: { sessionId: ..., activationCount: 5 }
[FileSwitchTracker] Successfully saved window
```

## 🎯 Key Points

1. **Automatic Tracking**: No manual start needed - activates when VS Code opens
2. **All Activations Count**: Going back to file A counts as a new activation
3. **5-Minute Windows**: Data sent every 5 minutes automatically
4. **Session ID**: Each VS Code session gets unique ID (e.g., `session-1735464000-xyz`)
5. **Workspace Tag**: Identifies which workspace you're working in

## 🛠️ Configuration

Current settings (in `FileSwitchTracker.ts`):
- **Window Interval**: 5 minutes (line 11)
- **API Base URL**: http://localhost:4000 (in `extension.ts`)
- **Session ID Format**: `session-{timestamp}-{random}`

## 📝 Optional: Manual Stats Check

Add this to your VS Code command palette (already registered):
- Press `Cmd+Shift+P`
- Type: "Show File Switch Stats"
- See current window stats without waiting 5 minutes

## 🚀 Production Notes

For production deployment:
1. Build dashboard: `npm run build:dashboard`
2. Extension loads from `dist/dashboard` folder (not localhost:5173)
3. Make API URL configurable via VS Code settings
4. Disable notification or make it less frequent
5. Add error handling for offline scenarios
