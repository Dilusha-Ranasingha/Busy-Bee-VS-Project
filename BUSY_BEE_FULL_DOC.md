# Busy Bee Project – Full Documentation

## 1. Project Overview

Busy Bee is a multi-package monorepo that provides:
- A **VS Code extension** that tracks developer activity (file switching and other metrics) and embeds a dashboard in the sidebar.
- A **backend API** (Node.js/Express/PostgreSQL) that stores metrics and product/feature data.
- A **React + TypeScript dashboard** that runs both standalone and inside the extension, fully integrated with VS Code themes.

Core goals:
- Track developer behavior (file switches and other productivity metrics) per user and per workspace.
- Analyze and visualize **Code Risk** and **Metrics Tracking** data.
- Integrate smoothly into VS Code via a native-feeling, theme-aware UI.

Monorepo layout:
- `packages/backend` – REST API, PostgreSQL schema, feature-based modules (products, file switch tracking, etc.).
- `packages/dashboard` – React dashboard, VS Code theme integration, product and metrics pages.
- `packages/extension` – VS Code extension (tracking, GitHub auth, embedded dashboard webview).


## 2. High-Level Architecture

### 2.1 System Components

- **VS Code Extension**
  - Activates in the VS Code Extension Host.
  - Tracks file switches and other developer metrics.
  - Authenticates via VS Code’s built-in GitHub provider.
  - Hosts a sidebar **Product Dashboard** webview.

- **Backend API**
  - Node.js + Express + TypeScript server.
  - PostgreSQL database (via `pg`).
  - Feature-based modules (`products`, `fileSwitch`, and others such as Code Risk / Metrics Tracking).
  - Exposes REST endpoints for metrics and products.

- **PostgreSQL Database**
  - Stores product data and developer activity metrics.
  - Key table: `file_switch_windows` (5-minute windows of file activations).

- **Dashboard (React)**
  - Standalone (Browser) mode: runs at `http://localhost:5173`.
  - VS Code Webview mode: embedded in sidebar via `ProductDashboardViewProvider`.
  - Integrates tightly with VS Code theme tokens (light / dark / high contrast).
  - Pages for products, file switch analytics, and (via other packages) Code Risk & Metrics Tracking.

### 2.2 Architectural Diagram

```text
┌───────────────────────────────────────────────┐
│                  Developer                    │
│     (VS Code with Busy Bee extension)        │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│             VS Code Extension                 │
│  - extension.ts                               │
│  - AuthManager (GitHub via VS Code)          │
│  - Tracking (FileSwitchTracker + others)     │
│  - ProductDashboardViewProvider (webview)    │
└───────────────────────────────────────────────┘
                    │  HTTP (Axios)
                    ▼
┌───────────────────────────────────────────────┐
│                Backend API                    │
│  - Express app (api/app.ts)                  │
│  - Features: products, fileSwitch, …         │
│  - GitHub OAuth proxy for dashboard          │
└───────────────────────────────────────────────┘
                    │  SQL (pg)
                    ▼
┌───────────────────────────────────────────────┐
│              PostgreSQL Database              │
│  - file_switch_windows                       │
│  - product tables                             │
│  - other metrics tables (Code Risk, etc.)    │
└───────────────────────────────────────────────┘
                    ▲
                    │ REST (fetch/Axios)
┌───────────────────────────────────────────────┐
│          React Dashboard (Browser            │
│          or VS Code Webview)                │
│  - Product & metrics pages                  │
│  - File Switch Rate analytics               │
│  - Code Risk & Metrics Tracking UI          │
│  - VS Code theme-aware styling              │
└───────────────────────────────────────────────┘
```


## 3. Main Features

### 3.1 Code Risk

**Purpose**: Provide a "Code Risk" view that analyzes code or changes and surfaces risk-related insights to the dashboard and/or extension.

**Implementation hints from the repo structure** (not fully detailed in the attached docs but visible in the workspace):
- Backend: `packages/backend/src/features/Code-Risk/` (feature-based backend module for Code Risk APIs and data).
- Dashboard: `packages/dashboard/src/hooks/useCodeRisk.ts`, `src/pages/Code-Risk/`, `src/services/Code-Risk/`, `src/types/Code-Risk/`.
- Extension: Code Risk data can be surfaced through the embedded dashboard webview.

Typical responsibilities:
- Expose HTTP endpoints under a Code Risk feature (e.g., scoring endpoints, history per repo/workspace).
- Provide TypeScript types and hooks for consuming risk scores on the dashboard.
- Potentially integrate with AI analysis (`@google/genai` is present in backend dependencies) to compute risk metrics.

> For exact scoring logic and models, refer to the Code Risk feature source files under the `Code-Risk` directories in backend and dashboard.


### 3.2 Metrics Tracking

**Purpose**: Track multiple aspects of developer activity to understand productivity and flow, then visualize them in the dashboard.

The Metrics Tracking feature consists of three layers:
- **Extension trackers** that observe VS Code events and periodically send metrics to the backend.
- **Backend features** that store and aggregate metrics.
- **Dashboard hooks/pages** that fetch and visualize the metrics.

#### 3.2.1 File Switch Tracking (documented in detail)

File Switch Tracking is the main, fully documented metric so far.

- Extension:
  - `packages/extension/src/tracking/FileSwitchTracker.ts` tracks file activations via `vscode.window.onDidChangeActiveTextEditor`.
  - Every file activation increments a counter; returning to the same file still counts (A → B → A = 3 activations).
  - Windows of 5 minutes are used; every 5 minutes the extension posts a summarized window to the backend.
  - Sessions are identified by a unique `sessionId` per VS Code instance and tagged with `workspaceTag`.

- Backend:
  - Feature folder: `packages/backend/src/features/fileSwitch/`.
  - DB table: `file_switch_windows` (see schema below).
  - REST endpoints:
    - `POST /api/file-switch/windows` – creates a window record.
    - `GET /api/file-switch/windows?sessionId=...` – lists windows for a session.
    - `GET /api/file-switch/sessions?date=YYYY-MM-DD` – summarizes sessions by date.

- Dashboard:
  - Types: `packages/dashboard/src/types/fileSwitch.types.ts`.
  - Services: `packages/dashboard/src/services/fileSwitch.service.ts`.
  - Page: `packages/dashboard/src/pages/FileSwitchRate/FileSwitchRatePage.tsx`.
  - Features:
    - Date picker selects a day.
    - Session list for that date.
    - Detailed table of 5-minute windows for the selected session.

#### 3.2.2 Other Metrics (extension + dashboard)

From the extension and dashboard structure, the Metrics Tracking domain also includes trackers and hooks such as:
- Commit edit sessions
- Diagnostic density (errors/warnings density)
- Edit sessions
- Error fix time & error sessions
- Focus streaks
- Idle sessions
- Save edit sessions
- Task runs

Relevant locations in the repo (names from the workspace tree):
- Extension trackers: `packages/extension/src/tracking/CommitEditSessionsTracker.ts`, `DiagnosticDensityTracker.ts`, `EditSessionTracker.ts`, `ErrorFixTimeTracker.ts`, `ErrorSessionTracker.ts`, `FileSwitchTracker.ts`, `FocusStreakTracker.ts`, `IdleSessionsTracker.ts`, etc.
- Dashboard hooks: `packages/dashboard/src/hooks/useCommitEditSessions.ts`, `useDiagnosticDensity.ts`, `useEditSessions.ts`, `useErrorFixTime.ts`, `useFocusStreaks.ts`, `useIdleSessions.ts`, `useSaveEditSessions.ts`, `useTaskRuns.ts`.
- Backend: corresponding features live under `packages/backend/src/features/Metrics-Tracking/` (and similarly named feature folders).

These components follow the same general pattern as file switch tracking:
- Extension tracker → Backend API → PostgreSQL → Dashboard view.

> For exact schemas and endpoints of each metric, see the respective feature directories under `features/Metrics-Tracking` and the matching hooks/services in the dashboard.


## 4. Dependencies Overview

### 4.1 Root Workspace (busy-bee)

File: `package.json`

- Monorepo using npm workspaces: `"workspaces": ["packages/*"]`.
- Scripts:
  - `dev` – runs backend and dashboard together using `concurrently`.
  - `build` – builds extension, backend, and dashboard.
  - `build:extension` – builds dashboard for the extension via `scripts/build-dashboard.js`.
  - `dev:extension` – runs dashboard dev server for extension development.
- Dev dependencies:
  - `concurrently`, `prettier`, `typescript`.

### 4.2 Backend (`packages/backend/package.json`)

- Runtime dependencies:
  - `express` – HTTP server framework.
  - `pg` – PostgreSQL client.
  - `dotenv` – environment variable loading.
  - `morgan` – HTTP request logging.
  - `cors` – CORS handling.
  - `node-cron` – scheduled jobs (e.g., daily scoring / metrics jobs in `jobs/`).
  - `axios` – HTTP client (e.g., calling external services such as GitHub or AI backends).
  - `@google/genai` – Google Gemini client library (used for AI-based features such as Code Risk).
- Dev dependencies:
  - TypeScript tooling (`typescript`, `tsx`, `@types/*`).
  - ESLint types.

### 4.3 Dashboard (`packages/dashboard/package.json`)

- Runtime dependencies:
  - `react`, `react-dom` – UI framework.
  - `chart.js`, `react-chartjs-2` – Charts for metrics visualization.
  - `lucide-react` – Icon set.
- Dev dependencies:
  - `vite` – bundler/dev server.
  - `tailwindcss`, `postcss`, `autoprefixer` – styling.
  - `eslint` + `typescript-eslint`, `@eslint/js` – linting.
  - `typescript`, `@types/react`, `@types/react-dom`, `@types/node`.

### 4.4 Extension (`packages/extension/package.json`)

- Runtime dependencies:
  - `axios` – HTTP client used from the extension to talk to the backend.
- Dev dependencies:
  - `@types/vscode` – VS Code API typings.
  - Testing: `@vscode/test-cli`, `@vscode/test-electron`, `@types/mocha`.
  - Build: `esbuild`, `npm-run-all`, `typescript` and `typescript-eslint`, `eslint`.


## 5. Project History (High-Level)

This is a narrative summary based on the attached documents and structure rather than full git history.

1. **Initial Backend & Products Feature**
   - Set up backend in `packages/backend` with feature-based structure.
   - Implemented core `products` feature with model, service, controller, and routes.

2. **Initial VS Code Extension Skeleton**
   - Generated extension scaffold (see `vsc-extension-quickstart.md`).
   - Added `extension.ts`, a basic `helloWorld` command, and test setup.
   - Created `CHANGELOG.md` with an initial “Unreleased / Initial release” entry.

3. **File Switch Tracking Feature**
   - Implemented `FileSwitchTracker` in the extension with 5-minute aggregation windows.
   - Added backend `fileSwitch` feature with `file_switch_windows` table and REST endpoints.
   - Created a File Switch Rate analytics page in the dashboard.
   - Documented backend feature in `packages/backend/README.md` and dashboard feature in `packages/dashboard/README.md`.

4. **Dashboard & VS Code Theme Integration**
   - Migrated the dashboard to a VS Code theme-aware design.
   - Added `vscode-tokens.css`, `vscode-theme.ts`, Tailwind token wiring.
   - Implemented `ProductDashboardViewProvider.ts` for embedding the dashboard as a webview.
   - Updated components and pages to use semantic `vscode-*` and `brand-*` Tailwind classes.
   - Documented in `IMPLEMENTATION_SUMMARY.md`, `VSCODE_THEME_INTEGRATION.md`, `COLOR_MIGRATION.md`, `RESPONSIVE_LAYOUT.md`, and `packages/dashboard/QUICKSTART.md`.

5. **GitHub Authentication Integration**
   - Extension side:
     - Implemented `AuthManager.ts` using VS Code’s built-in GitHub provider (no custom OAuth app needed).
     - FileSwitchTracker updated to require an authenticated user and include `userId` in uploads.
     - Documented behavior and testing in `GITHUB_AUTH_TESTING.md`.
   - Dashboard/Backend side:
     - Introduced manual GitHub OAuth app for dashboard.
     - Backend exposes `/api/auth/github/token` for exchanging OAuth `code` for GitHub access_token.
     - Dashboard stores token in localStorage, fetches GitHub user profile, and filters metrics by user.
     - Documented in `GITHUB_OAUTH_SETUP.md`.

6. **Metrics & Future Extensions**
   - Added more trackers (commit edits, diagnostic density, focus/idle, etc.) in the extension.
   - Added hooks and pages in dashboard for broader Metrics Tracking.
   - Introduced AI-related dependencies (`@google/genai`) and feature folders for Code Risk analysis.

> For precise commit-by-commit history, refer to `git log` in the repository; this section is a functional timeline based on the documentation you provided.


## 6. Included Guides & Documentation (Merged Content)

Below are the original guides merged into this single file for convenience.

---

### 6.1 GitHub Authentication Testing Guide (Extension)

> Source: `GITHUB_AUTH_TESTING.md`

#### Overview
The Busy Bee extension now requires GitHub authentication to track file switching metrics. All data is associated with the authenticated GitHub user.

#### System Architecture

**1. Extension (VS Code)**
- `AuthManager` (`extension/src/auth/AuthManager.ts`): Manages GitHub OAuth using VS Code's built-in authentication provider.
- `FileSwitchTracker` (`extension/src/tracking/FileSwitchTracker.ts`): Tracks file activations, requires authenticated user.
- Extension Commands:
  - `Busy Bee: Sign in with GitHub` – Initiates OAuth flow.
  - `Busy Bee: Sign out` – Clears authentication.
  - `Busy Bee: Show File Switch Stats` – Shows current session stats.

**2. Backend (Node.js/Express/PostgreSQL)**
- Database schema: `file_switch_windows` table with `user_id` column.
- API endpoints:
  - `POST /api/file-switch/windows` – Create session (requires userId in payload).
  - `GET /api/file-switch/sessions?date=YYYY-MM-DD&userId=xxx` – List sessions by date and user.
  - `GET /api/file-switch/windows?sessionId=xxx&userId=xxx` – Get session details.

**3. Dashboard (React)**
- Currently displays all sessions; will be updated to filter by authenticated user.

#### Testing Steps

**Step 1: Start the Extension**
```bash
# In VS Code, press F5 to start the Extension Development Host
# Or run:
code --extensionDevelopmentPath=/Users/dilusharanasingha/Documents/development/Research/busy-bee/packages/extension
```

**Step 2: Sign In with GitHub**
1. Open Command Palette (Cmd+Shift+P).
2. Type: `Busy Bee: Sign in with GitHub`.
3. Select the command – VS Code opens GitHub OAuth popup.
4. Authorize the application in the browser.
5. Check Debug Console for:
   ```
   [AuthManager] User signed in: {username}
   [AuthManager] Auth state changed: signed in
   [FileSwitchTracker] Tracker started after sign-in
   ```

**Step 3: Verify Tracking**
1. Switch between files in the Extension Development Host.
2. Check Debug Console for activation logs:
   ```
   [FileSwitchTracker] File activated: file:///... (count: 1, session: session-xxx)
   [FileSwitchTracker] File activated: file:///... (count: 2, session: session-xxx)
   ```
3. Wait 10 minutes of inactivity OR manually trigger session end.
4. Check for successful upload:
   ```
   [FileSwitchTracker] Flushing session data: {userId: "12345", sessionId: "session-xxx", ...}
   [FileSwitchTracker] Successfully saved session: {id: "uuid", ...}
   ```
5. Verify notification appears: "Session ended: X file switches in Y min (rate: Z/min)".

**Step 4: Verify Database**
```bash
# Connect to PostgreSQL
docker exec -it productivity-postgres-busy-bee psql -U postgres -d productivity_db

# Check data
SELECT id, user_id, session_id, activation_count, rate_per_min, window_start, window_end 
FROM file_switch_windows 
ORDER BY created_at DESC 
LIMIT 5;

# Verify user_id matches GitHub user ID
# Get your GitHub user ID from: https://api.github.com/users/{your-username}
```

**Step 5: Test Sign Out**
1. Open Command Palette (Cmd+Shift+P).
2. Type: `Busy Bee: Sign out`.
3. Check Debug Console:
   ```
   [AuthManager] User signed out
   [AuthManager] Auth state changed: signed out
   [FileSwitchTracker] Tracker stopped after sign-out
   ```
4. Try switching files – should show warning:
   ```
   [FileSwitchTracker] User not signed in, skipping data upload
   Warning notification: "Sign in with GitHub to track file switching metrics"
   ```

**Step 6: Test Session Restoration**
1. Close the Extension Development Host.
2. Press F5 again to restart.
3. Check Debug Console:
   ```
   [AuthManager] Restored session for user: {username}
   [FileSwitchTracker] Tracker started (user already signed in)
   ```
4. Verify tracking works without re-authentication.

#### Expected Behavior

**When Signed In ✅**
- File activations are tracked.
- Sessions are created on first file switch.
- Sessions end after 10 minutes of inactivity.
- Data is uploaded to backend with userId.
- User sees success notifications.

**When Signed Out ❌**
- File activations are NOT tracked.
- No data is sent to backend.
- Warning message shown if user switches files.
- Stats command shows "Sign in with GitHub to view stats".

#### API Testing with cURL

```bash
# Test creating a session (requires userId)
curl -X POST http://localhost:4000/api/file-switch/windows \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12345",
    "sessionId": "test-session-1",
    "windowStart": "2025-01-02T10:00:00.000Z",
    "windowEnd": "2025-01-02T10:15:00.000Z",
    "activationCount": 42,
    "ratePerMin": 2.8,
    "workspaceTag": "workspace-busy-bee"
  }'

# Get sessions for a specific date and user
curl "http://localhost:4000/api/file-switch/sessions?date=2025-01-02&userId=12345"

# Get windows for a specific session
curl "http://localhost:4000/api/file-switch/windows?sessionId=test-session-1&userId=12345"
```

#### Troubleshooting

- **"Sign in with GitHub" command not found**:
  ```bash
  cd packages/extension
  npm run compile
  # Then press F5 again
  ```
- **GitHub OAuth popup doesn't appear**:
  - Check VS Code Settings → search "authentication" → ensure GitHub authentication is enabled.
- **Data not appearing in database**:
  - Backend running: `http://localhost:4000/health`.
  - Database running: `docker ps | grep postgres`.
  - User signed in (check Debug Console).
  - Look for axios/network errors in Debug Console.
- **"userId is required" error**:
  - Verify you are signed in.
  - Ensure `authManager.getUserId()` returns a value.
  - Ensure FileSwitchTracker receives `authManager` correctly.

#### GitHub User ID Lookup

```bash
curl https://api.github.com/users/{username}
# Returns: {"id": 12345, "login": "username", ...}
```

Or from AuthManager in debug console:
```ts
authManager.getUser()
// {id: "12345", username: "...", email: "...", avatarUrl: "..."}
```

---

### 6.2 GitHub OAuth Setup Guide (Dashboard + Backend)

> Source: `GITHUB_OAUTH_SETUP.md`

This guide describes setting up GitHub OAuth for:
- VS Code extension (built-in, already working).
- Dashboard (manual GitHub OAuth app).

#### Overview

**VS Code Extension (Built-in Auth)**
- Uses VS Code’s built-in GitHub provider.
- No OAuth app registration required.
- Token managed by VS Code.

**Dashboard (Manual OAuth App)**
- Requires a GitHub OAuth App.
- Uses standard OAuth 2.0 authorization code flow.
- Backend handles code→token exchange.
- Dashboard stores token in browser localStorage.

#### Part 1: Extension

Already working – just run:
1. Cmd/Ctrl+Shift+P.
2. `Busy Bee: Sign in with GitHub`.
3. Authorize in browser.

#### Part 2: Dashboard OAuth Setup

**Step 1: Create a GitHub OAuth App**

1. Go to https://github.com/settings/developers → OAuth Apps → New OAuth App.
2. Fill details:
   ```
   Application name: Busy Bee Dashboard (Development)
   Homepage URL: http://localhost:5173
   Authorization callback URL: http://localhost:5173/auth/callback
   ```
3. Register application.
4. Collect:
   - Client ID.
   - Client Secret (save immediately).

**Step 2: Configure Backend**

```bash
cd packages/backend
```
Add to `.env`:
```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=Ov23liABjmFCB9YjjfRA  # Replace with your Client ID
GITHUB_CLIENT_SECRET=your_secret_here   # Replace with your Client Secret
```
Restart backend:
```bash
npm run dev
```

**Step 3: Configure Dashboard**

```bash
cd packages/dashboard
cp .env.example .env
```
Update `.env`:
```env
VITE_GITHUB_CLIENT_ID=Ov23liABjmFCB9YjjfRA
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback
```
Restart dashboard:
```bash
npm run dev
```

#### Testing Dashboard Authentication

1. Open `http://localhost:5173`.
2. Click **Sign in with GitHub**.
3. Authorize, then return to dashboard.
4. Verify:
   - Avatar + username in header.
   - File Switch page now filtered by your user.
   - Sign Out works.

#### Production Deployment

- Create a production OAuth App with:
  ```
  Homepage URL: https://yourdomain.com
  Authorization callback URL: https://yourdomain.com/auth/callback
  ```
- Update backend `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
- Update dashboard `VITE_GITHUB_CLIENT_ID` / `VITE_GITHUB_REDIRECT_URI`.
- Keep secrets out of git; use environment management.

#### Troubleshooting

- **"OAuth not configured"** – ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set and backend restarted.
- **"Failed to exchange code for token"** – verify client secret & redirect URI; ensure backend on `http://localhost:4000`.
- **Redirect loop / "Invalid OAuth state"** – clear browser localStorage; try again; check console.
- **CORS errors** – verify backend CORS; backend on `http://localhost:4000` and dashboard on `http://localhost:5173`.

#### Security Best Practices

- Never commit `.env` files; use `.env.example` templates.
- Use separate OAuth apps for dev and prod.
- Rotate secrets regularly and limit scopes (`user:email`, `read:user`).

#### Architecture Overview

```text
User → Dashboard → GitHub OAuth Popup
                    ↓
                Authorize & Redirect
                    ↓
Dashboard (with code) → POST /api/auth/github/token → Backend
                                                         ↓
                                            Exchange code for token
                                                         ↓
Backend → Returns access_token → Dashboard
                                    ↓
Dashboard → Fetch user info from GitHub API
            ↓
Store token + user in localStorage
            ↓
Make authenticated API calls to backend (with userId)
```

---

### 6.3 VS Code Theme Integration – Implementation Summary

> Source: `IMPLEMENTATION_SUMMARY.md`

This section summarizes the completed implementation for VS Code theme integration.

- Created `src/styles/vscode-tokens.css` in dashboard with 180+ lines of VS Code theme tokens.
- Created `src/utils/vscode-theme.ts` for theme detection and webview messaging.
- Added `VSCODE_THEME_INTEGRATION.md` and `QUICKSTART.md` for documentation.
- Created `ProductDashboardViewProvider.ts` in the extension to host the webview and sync theme colors.
- Modified Tailwind config, `index.css`, `main.tsx`, `App.tsx`, UI components, and key pages to use semantic VS Code tokens and brand colors.
- Registered the view container and webview view in `packages/extension/package.json` and `src/extension.ts`.

Key design:
- Three-layer color system: CSS tokens → Tailwind mappings → components.
- Removed previous manual dark mode handling and hard-coded colors.
- Introduced brand colors: primary blue `#0b4063`, accent yellow `#bf941d`.

(See full theme details in sections 6.4–6.7 below.)

---

### 6.4 Backend – Feature Overview & File Switch Tracking

> Sources: root `README.md` for backend + `packages/backend/README.md`

- Backend is a feature-based Node.js/Express/TypeScript API with PostgreSQL.
- Key layers: routes, controllers, services, models, types.
- Products feature under `src/features/products`.
- File Switch tracking feature under `src/features/fileSwitch`.
- DB schema in `init.sql` defines `file_switch_windows` with indexes.

The File Switch feature:
- Stores 5-minute window metrics from the extension.
- Provides `POST /api/file-switch/windows`, `GET /api/file-switch/windows`, `GET /api/file-switch/sessions` endpoints.
- Validates payloads (non-empty session ID, ISO timestamps, non-negative counts/rates).
- Aggregates sessions by date for dashboard consumption.

---

### 6.5 Extension – Busy Bee VS Code Extension Overview

> Source: `packages/extension/README.md`

- Tracks file switching behavior and exposes insights via integrated dashboard.
- Project structure:
  - `src/extension.ts` – entry point.
  - `src/tracking/FileSwitchTracker.ts` – file switch logic.
  - `src/webview/ProductDashboardViewProvider.ts` – webview provider.
  - `dist/dashboard` – production dashboard build.
- Features:
  - File Switch Tracking, Integrated dashboard, Session Management.
- Commands:
  - `busy-bee-vs.helloWorld`.
  - `busy-bee-vs.signIn`, `busy-bee-vs.signOut`, `busy-bee-vs.showFileSwitchStats`.
- How it works:
  - On activation, `FileSwitchTracker` starts, generates `sessionId`, and listens to active editor changes.
  - Every 5 minutes, it posts a window to the backend, showing a notification and resetting counters.
  - On deactivation, it flushes remaining data and cleans up.
- Dashboard views:
  - Product Dashboard with tabs for Dashboard, Add, List, File Switch.
  - File Switch page shows date-based session list and 5-minute windows table.

---

### 6.6 Dashboard – Package Overview

> Source: `packages/dashboard/README.md`

- React + TypeScript dashboard for product management and metrics.
- Key structure:
  - `src/types` – `product.types.ts`, `fileSwitch.types.ts`, `api.types.ts`.
  - `src/services` – `api.client.ts`, `product.service.ts`, `fileSwitch.service.ts`.
  - `src/components/ui` – Card, Button, Input, Textarea, LoadingSpinner, all VS Code themed.
  - `src/pages` – Dashboard, AddProduct, ProductList, FileSwitchRate.
  - `src/styles/vscode-tokens.css` – theme tokens.
  - `src/utils/vscode-theme.ts` – theme detection.
- File Switch Rate page provides date filtering, session listing, 5-min windows, and metrics visualization.
- VS Code theme integration via CSS variables and Tailwind color mappings (`vscode.*`, `brand.*`).

---

### 6.7 Color Migration & VS Code Theme Integration Details

> Sources: `COLOR_MIGRATION.md`, `VSCODE_THEME_INTEGRATION.md`, `RESPONSIVE_LAYOUT.md`, `packages/dashboard/QUICKSTART.md`

- All hard-coded colors (e.g., `bg-indigo-600`, `text-gray-700`) replaced with VS Code token-based classes:
  - Navigation: `bg-brand-primary`, `bg-vscode-input-bg`, `ring-vscode-focus`.
  - Cards: `bg-vscode-widget-bg`, `shadow-vscode`, `ring-vscode-widget-border`.
  - Buttons: `bg-brand-primary`, `bg-vscode-button-secondary-bg`, `border-vscode-input-border`.
  - Inputs: `bg-vscode-input-bg`, `border-vscode-input-border`, `text-vscode-input-fg`.
  - Text: `text-vscode-foreground`, `text-vscode-description`, `text-vscode-error`, `text-brand-accent`.

- Theme integration:
  - `vscode-tokens.css` defines `--vscode-*` and brand CSS variables with fallbacks for standalone browser mode.
  - Tailwind config maps colors to those variables.
  - `vscode-theme.ts` detects VS Code webview context, listens to theme messages, and updates CSS variables.

- Responsive layout:
  - Side navigation (documented in `RESPONSIVE_LAYOUT.md`) is optimized for VS Code sidebar widths.
  - Collapsible nav with icons-only at 48px, expanding on hover.
  - Pages adapt for narrow, medium, and wide panel widths.

- Quickstart testing:
  - `npm run dev` in dashboard for standalone.
  - `npm run dev` in dashboard + F5 in extension for webview.
  - Test theme switching using VS Code color themes and verify tokens.

---

### 6.8 Extension Quickstart & Changelog

> Sources: `packages/extension/vsc-extension-quickstart.md`, `packages/extension/CHANGELOG.md`

- Quickstart describes how to:
  - Press F5 to open Extension Development Host.
  - Run the Hello World command.
  - Debug `extension.ts` and run tests using VS Code test runner.
- Changelog currently records an initial “Unreleased / Initial release”.


## 7. How to Use This Document

- Use **Sections 1–3** for a conceptual overview (project, architecture, main features including Code Risk & Metrics Tracking).
- Use **Section 4** to understand dependencies across packages.
- Use **Section 5** for a narrative project history.
- Use **Section 6** as a single place to read all of the original guides you attached.

If you’d like, I can next:
- Add a short "Getting Started for New Developers" section summarizing how to run all services together, or
- Expand the Code Risk and Metrics Tracking sections with more specific details by scanning those feature folders in the code. 