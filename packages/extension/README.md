# Busy Bee VS Code Extension

A productivity tracking extension that monitors your file switching behavior and provides insights through an integrated dashboard.

## 📁 Project Structure

```
packages/extension/
├── src/
│   ├── extension.ts                      # Main extension entry point
│   ├── tracking/
│   │   └── FileSwitchTracker.ts         # File switch tracking logic
│   ├── webview/
│   │   └── ProductDashboardViewProvider.ts  # Dashboard webview provider
│   └── test/
│       └── extension.test.ts
├── dist/                                 # Compiled extension output
│   └── dashboard/                        # Built dashboard (production)
├── resources/                            # Extension icons and assets
├── package.json                          # Extension manifest
└── tsconfig.json
```

## ✨ Features

### 1. **File Switch Tracking**
- Automatically tracks every file activation in VS Code
- Counts all file switches, including returning to previously opened files
- Example: File A → File B → File A counts as **3 activations**
- Data is collected in 5-minute windows
- Automatically sends metrics to backend API every 5 minutes

### 2. **Integrated Dashboard**
- Product management dashboard embedded in VS Code sidebar
- File Switch Rate analytics page with:
  - Session listing by date
  - 5-minute window breakdown
  - Activation count and rate metrics
- Adapts to VS Code theme (light/dark/high-contrast)

### 3. **Session Management**
- Unique session ID generated for each VS Code instance
- Workspace tagging to distinguish between projects
- Automatic session start on extension activation
- Graceful session end on extension deactivation

## 📋 Requirements

### Runtime Dependencies
- **Backend API**: Must be running on `http://localhost:4000` (or configured URL)
- **PostgreSQL Database**: Required for data storage (runs via Docker in backend)
- **Node.js**: v16 or higher

### NPM Dependencies
- `vscode`: ^1.107.0 - VS Code Extension API
- `axios`: ^1.7.9 - HTTP client for API communication

## 🚀 How It Works

### File Switch Tracking Flow

1. **Extension Activation**
   - Extension activates when VS Code starts
   - `FileSwitchTracker` initializes automatically
   - Generates unique session ID (e.g., `session-1735464000-xyz`)
   - Starts 5-minute interval timer

2. **File Activation Detection**
   ```typescript
   // Listens to: vscode.window.onDidChangeActiveTextEditor
   User opens file A          → Count: 1
   User switches to file B    → Count: 2
   User returns to file A     → Count: 3  ✅ Counted again!
   User opens file C          → Count: 4
   ```

3. **Data Collection (Every 5 Minutes)**
   - Calculates `ratePerMin = activationCount / 5`
   - Sends payload to backend:
     ```json
     {
       "sessionId": "session-1735464000-xyz",
       "windowStart": "2025-12-30T10:00:00.000Z",
       "windowEnd": "2025-12-30T10:05:00.000Z",
       "activationCount": 12,
       "ratePerMin": 2.4,
       "workspaceTag": "workspace-my-project"
     }
     ```
   - Displays notification with stats
   - Resets counter for next window

4. **Extension Deactivation**
   - Flushes any remaining data
   - Stops interval timer
   - Cleans up event listeners

### Architecture

```
┌─────────────────────────────────────────┐
│         VS Code Extension Host          │
├─────────────────────────────────────────┤
│  extension.ts (Entry Point)             │
│    ↓                                    │
│  FileSwitchTracker (Tracking Logic)     │
│    ↓ every 5 min                        │
│  Axios → POST /api/file-switch/windows  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│       Backend API (localhost:4000)      │
│         PostgreSQL Database             │
└─────────────────────────────────────────┘
              ↑
┌─────────────────────────────────────────┐
│    Dashboard Webview (React)            │
│  GET /api/file-switch/sessions          │
│  GET /api/file-switch/windows           │
└─────────────────────────────────────────┘
```

## ⚙️ Extension Settings

Currently, settings are hardcoded in the extension. Future versions will add:

* `busyBee.apiBaseUrl`: Backend API URL (default: `http://localhost:4000`)
* `busyBee.windowIntervalMinutes`: Tracking window duration (default: `5`)
* `busyBee.enableNotifications`: Show/hide success notifications (default: `true`)
* `busyBee.tracking.enabled`: Enable/disable file switch tracking (default: `true`)

## 🎯 Available Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

* **`Show File Switch Stats`** - Display current window statistics without waiting for 5-minute flush
  - Shows: Session ID, current activation count, window start time, last active file
  
* **`Hello World`** - Test command to verify extension is active

## 📊 Dashboard Views

The extension contributes a sidebar view in the Activity Bar:

* **Product Dashboard** - Main dashboard with tabs:
  - **Dashboard**: Product overview with charts
  - **Add**: Create new products
  - **List**: View all products
  - **File Switch**: ⭐ View file switching analytics

### File Switch Analytics Page

**Left Panel:**
- Date picker to select tracking date
- List of sessions recorded on that date
- Session metadata: start/end times, window count

**Right Panel:**
- 5-minute window breakdown table
- Columns: Window time range, Activation count, Rate/min, Workspace tag
- Summary stats: Total activations, Average rate, Session duration

**Features:**
- VS Code theme integration (colors adapt automatically)
- Real-time data updates
- Click session to view detailed windows

## 🛠️ Development

### Setup

1. **Install dependencies:**
   ```bash
   cd packages/extension
   npm install
   ```

2. **Start backend (required for testing):**
   ```bash
   cd packages/backend
   npm run dev
   ```

3. **Run extension in debug mode:**
   - Press `F5` in VS Code
   - Extension Development Host window opens
   - Tracking starts automatically

### Development Modes

**Dev Mode (Hot Reload):**
```typescript
// In ProductDashboardViewProvider.ts
const isDevelopment = process.env.NODE_ENV === 'development';
```
- Dashboard loads from `http://localhost:5173`
- Changes reflect immediately (no rebuild)
- Perfect for UI development

**Production Mode:**
```bash
npm run build:dashboard  # Builds dashboard
```
- Dashboard loads from `dist/dashboard/`
- Used for extension packaging
- Testing production build

### File Structure Details

**`src/tracking/FileSwitchTracker.ts`**
```typescript
class FileSwitchTracker {
  private activationCount: number          // Current window count
  private windowStart: Date                // Window start timestamp
  private sessionId: string                // Unique session identifier
  private windowIntervalMinutes: number    // Window duration (5 min)
  private intervalTimer: NodeJS.Timeout    // Auto-flush timer
  private lastActiveFile: string           // Last activated file URI
  
  start()         // Begin tracking
  stop()          // End tracking & flush
  flushWindow()   // Send data to API
}
```

**`src/extension.ts`**
- Extension activation/deactivation lifecycle
- Tracker initialization and cleanup
- Command registration
- Webview provider registration

### Testing File Switch Tracking

1. **Start Extension Development Host** (F5)
2. **Open Debug Console** to see logs:
   ```
   [FileSwitchTracker] Started tracking session: session-...
   [FileSwitchTracker] Initial file: file:///.../file.ts
   [FileSwitchTracker] File activated: file:///.../another.ts (count: 2)
   ```
3. **Switch between files** to generate activations
4. **Wait 5 minutes** or check stats via Command Palette
5. **Check dashboard** at http://localhost:5173 → File Switch tab

### Building for Production

```bash
# Build dashboard
npm run build:dashboard

# Compile extension
npm run compile

# Package extension
vsce package
```

## ⚠️ Known Issues

### Current Limitations

1. **API URL Hardcoded**: Backend must run on `http://localhost:4000`
   - *Workaround*: Manually edit `src/extension.ts` line 18
   - *Planned*: Add VS Code settings for configuration

2. **No Offline Support**: Extension requires active backend connection
   - *Impact*: Data lost if backend is down
   - *Planned*: Local caching with retry mechanism

3. **5-Minute Fixed Interval**: Window duration cannot be customized
   - *Workaround*: Edit `FileSwitchTracker.ts` line 11
   - *Planned*: Make configurable via settings

4. **Notification Spam**: Shows notification every 5 minutes
   - *Workaround*: Comment out notification in `FileSwitchTracker.ts` lines 121-124
   - *Planned*: Add setting to disable notifications

### Troubleshooting

**Extension not tracking:**
- Check Debug Console for errors
- Verify backend is running: `curl http://localhost:4000/api/health`
- Ensure database is running: `docker ps`

**Dashboard not loading:**
- Dev mode: Check `http://localhost:5173` is accessible
- Production: Verify `dist/dashboard/` exists after build
- Check webview console in Developer Tools

**Double counting activations:**
- Should be fixed in latest version
- If persists, check only one event listener is registered

## 📝 Release Notes

### 0.0.1 (Current)

**Initial Development Release**

✨ **New Features:**
- File Switch Tracking with 5-minute window aggregation
- Automatic session management with unique IDs
- Integrated Product Dashboard webview with VS Code theme support
- File Switch Rate analytics page with date-based session filtering
- Real-time metrics: activation count, rate per minute, workspace tagging

🐛 **Bug Fixes:**
- Fixed double counting issue when opening files (removed duplicate event listener)
- Fixed TypeScript errors in service layer and controllers
- Fixed API response data path issues

🔧 **Technical:**
- Backend API integration with PostgreSQL
- Axios HTTP client for API communication
- React dashboard with Tailwind CSS and VS Code theme tokens
- Feature-based architecture in backend
- Cross-platform build script using Node.js

**Known Limitations:**
- Backend URL hardcoded to localhost:4000
- 5-minute interval not configurable
- No offline data caching
- Requires backend and database running

### Upcoming Features (Planned)

🚀 **v0.1.0:**
- Configurable API URL via VS Code settings
- Customizable tracking interval
- Disable/enable tracking toggle
- Notification preferences
- Status bar indicator with current stats

🔮 **Future:**
- Offline mode with local storage
- Historical analytics and trends
- Workspace-specific tracking settings
- Export data to CSV/JSON
- Productivity insights and recommendations

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**


# To Make the extension run this in an empty folder where you want the project
npx --package yo --package generator-code -- yo code
