# 🐝 Busy Bee Project – Full Documentation

## 1. 📋 Project Overview

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


## 2. 🏗️ High-Level Architecture

### 2.1 🔧 System Components

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

### 2.2 📐 Architectural Diagram

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


## 3. ⭐ Main Features

### 3.1 📊 Metrics Tracking – AI Productivity Coach

This feature is the **multi-dimensional behavioral metrics engine** behind Busy Bee – an AI Productivity Coach for VS Code.

**Target users:** Undergraduate IT students & early-career developers.

**Goal:** Measure coding behavior *fairly* and turn it into **actionable, AI-generated productivity insights**—without ever sending source code content.

#### 3.1.1 🎯 End-to-end responsibilities (A → Z)

- Capture key developer signals from VS Code (edits, saves, file switching, diagnostics, tasks, commits, etc.).
- Build sessions & events (session-based, event-based, or hourly depending on the metric).
- Compute well-defined, noise-resistant metrics (focus streaks, edits/min, error fix time, etc.).
- Send **only aggregated JSON** (no raw code) to the backend API.
- Store data in PostgreSQL for analytics and dashboards.
- Call an AI model (Gemini / GPT) with a strict JSON schema to generate:
  - a **productivity score** per session or day,
  - **reasons** (what helped/hurt),
  - **top recommendations**.
- Surface clear UI in the extension & dashboard with “best of” style cards:
  - best streaks, best commit hour, best build/test hour, fastest error fix, etc.

#### 3.1.2 💡 Why this is novel

- Goes beyond simple time tracking or LOC counting.
- Uses **multi-dimensional behavioral metrics** tied to real developer flow (focus, typing cadence, build/test loops, error fix times, etc.).
- Careful **session & event modeling** (e.g., autosave compression, active vs pending error timers) reduces noise.
- **Privacy-first**: only stores aggregates and metadata; never source code.
- **Personalized AI coaching** based on each user’s own baseline, not generic benchmarks.

#### 3.1.3 🔍 System overview

High-level data flow:

```text
┌─────────────────┐        HTTPS (JWT)         ┌──────────────────────┐
│ VS Code         │ ─────────────────────────▶ │ Backend API (Node/TS)│
│  Extension (TS) │                            │  + PostgreSQL        │
│                 │ ◀───────────────────────── │  + AI client         │
└─────┬───────────┘        Insights            └─────┬────────────────┘
      │  editor/doc/debug/tasks/git events           │
      │                                              │
      │                Web Dashboard (React/Tailwind)│
      │                    (students/admins)         │
      └──────────────────────────────────────────────┘
```

Authentication is typically via GitHub OAuth → backend-issued JWT, with secrets stored via `vscode.secrets` in the extension.

#### 3.1.4 🗂️ Logical architecture

```text
Monorepo
busy-bee/
├─ packages/
│  ├─ extension/          # VS Code extension (TypeScript)
│  │  ├─ src/capture/     # listeners: editor, diagnostics, tasks, git
│  │  ├─ src/compute/     # metric calculators (per metric)
│  │  ├─ src/queue/       # retry + batching to backend
│  │  └─ src/ui/          # panels/cards for insights
│  │
│  ├─ backend/            # Node + Express + Postgres
│  │  ├─ src/features/
│  │  │  ├─ events/       # ingest endpoints
│  │  │  ├─ sessions/     # finalize sessions, aggregates
│  │  │  ├─ metrics/      # query APIs, best-of queries
│  │  │  └─ ai/           # AI scorer (Gemini/GPT), prompts, validators
│  │  └─ src/data/        # repositories, migrations
│  │
│  └─ dashboard/          # React + Vite + Tailwind
│     ├─ src/pages/       # Best-of cards, trends
│     └─ src/components/  # charts, filters
└─ docker/                # docker-compose for Postgres, .env.example
```

#### 3.1.5 📈 Final metrics (agreed definitions)

**Legend:**
- Session-based: Focus Streak, Edits per Minute, Save→Edit Ratio, Error Fix Time, Read vs Write.
- Event-based: Diagnostics Density (snapshot on change).
- Hourly: Task Runs & Pass Rate, Commit Cadence.

Each metric has a clearly defined storage model and UI “best-of” surface.

##### 🔥 Focus Streak (per-file & global) – session-based

- **Per-file streak:** continuous activity on the same file, ignoring micro-switches ≤ 30s.
- **Global streak:** continuous VS Code activity; broken by 10 minutes idle or editor close.
- Stored per session; UI shows best global streak and top per-file streaks.

Typical fields:

```text
focus_streak_max_min
focus_streak_avg_min
focus_streak_count
global_focus_streak_max_min
global_focus_streak_count
global_focus_time_min
```

##### ⌨️ Edits per Minute (typing cadence) – session-based

- Bucket 1-minute windows; count edit operations and inserted/deleted characters.
- Session ends after 10 minutes without edits.
- UI highlights the best session by `edits_per_min`.

Fields:

```text
edits_per_min, insert_chars_per_min, delete_chars_per_min,
add_delete_ratio, typing_burstiness_index, paste_events (optional)
```

##### 💾 Save-to-Edit Ratio & Save Reason – session-based

- Track manual vs autosave separately.
- **Autosave compression:** collapse rapid autosaves until ≥ 1 min no edits.
- **Checkpoint autosave:** autosave after ≥ 1 min idle counts as intent-like.
- UI shows the best session by `effective_save_to_edit_ratio`.

Fields:

```text
edits_total, saves_manual, autosaves_raw, autosaves_effective,
checkpoint_autosave_count,
save_to_edit_ratio_manual, save_to_edit_ratio_autosave, effective_save_to_edit_ratio,
median_secs_between_saves
```

##### 🔬 Diagnostics Density – event-based

- On diagnostics change (and/or save), create snapshot:
  `density_per_kloc = (errors + warnings) / max(0.001, lineCount / 1000)`.
- UI shows highest-density and lowest (or zero/clean) events with timestamps.

##### ⏱️ Error Fix Time – error-fix sessions

- Start session at first diagnostic; end when problem list returns to zero (debounced).
- Track **Active/Pending/Resolved** per diagnostic and only time the active error to avoid queue bias.
- UI surfaces fastest single fix and summary per session.

##### ✅ Task Runs (build/test) & Pass Rate – hourly

- Uses VS Code `tasks` API to track build/test runs.
- Store hourly rollups with pass rates and average durations.
- UI shows best hour by pass rate (or most runs).

##### 📝 Commit Cadence – hourly

- Uses VS Code Git API to detect completed commits.
- Store hourly rollups; UI highlights hour with most commits (or configurable).

##### 📖 Read vs Write Time – session-based

- Rolling 5s windows:
  - **Write**: any edit.
  - **Read**: selection/scroll/file-switch/debug without edits.
  - **Inactive** otherwise; session ends after 10 minutes inactive.
- UI shows highest read-time and highest write-time sessions.

#### 3.1.6 🤖 AI data contracts

Only aggregates are sent to the AI scorer, e.g.:

```json
{
  "user_id": "u123",
  "session": { "start": "10:00", "end": "11:30", "duration_min": 90 },
  "metrics": {
    "focus_streak_max_min": 28,
    "edits_per_min": 17,
    "effective_save_to_edit_ratio": 0.036,
    "diagnostics_density_per_kloc": 3.2,
    "min_active_fix_time_min": 1.8,
    "test_pass_rate": 0.75,
    "commit_count_hour_best": 5,
    "read_min": 32,
    "write_min": 58
  },
  "baseline": {
    "focus_streak_max_min_p50": 20,
    "edits_per_min_p50": 12,
    "diagnostics_density_per_kloc_p50": 5.0
  }
}
```

AI returns a strict JSON payload with `score`, `confidence`, `why`, `risks`, and `recommendations` that can be rendered directly in the UI.

#### 3.1.7 🗄️ Database sketch

PostgreSQL tables include (simplified list):

- `streaks`, `sessions_edits`, `save_edit_sessions`.
- `diagnostic_density_events`, `error_fix_sessions`, `error_fixes`.
- `task_run_hourly`, `commit_hourly`.

These tables are designed for **best-of queries** and time-series analytics.

#### 3.1.8 🔒 Privacy, ethics, and security

- No source code ever sent; only aggregates & metadata.
- Per-metric opt-in/out and local consent screen.
- User control for “delete my data” and local-only mode.
- File paths can be hashed into `file_hash` identifiers.
- JWT stored via `vscode.secrets`; all network traffic over HTTPS.

> Implementation-wise, this feature maps onto the existing trackers in `packages/extension/src/tracking`, backend metrics features, and dashboard hooks under `packages/dashboard/src/hooks`.


### 3.2 ⚠️ Code Risk – Code Risk & Complexity Visual Analyzer

This feature is the **Code Risk & Complexity Visual Analyzer**: an AI-powered, error-aware risk analysis component aimed at **individual developers** (students, freelancers, and solo programmers).

Its goals are to:
- Quickly identify *risky* files.
- Explain **why** errors are happening.
- Provide simple, AI-guided fix suggestions.
- Reduce time spent reading long error logs.

Unlike traditional static analysis tools, this feature:
- Works **in real time**, **triggered by real errors** (not continuous scanning).
- Provides **file-level risk visualization** directly in VS Code.

#### 3.2.1 🎯 Problem it solves

Developers frequently struggle with:
- Locating the actual problematic file in large projects.
- Understanding compiler/runtime error messages.
- Losing time during debugging sessions.

Existing tools (SonarQube, CodeScene, etc.):
- Focus on heavy, project-wide static analysis.
- Require manual log inspection.
- Are often not beginner-friendly and can slow development.

#### 3.2.2 ✨ Solution summary

The component introduces **event-triggered, AI-assisted risk analysis** that:
- Activates only when errors occur.
- Groups errors into **time-based error sessions**.
- Analyzes risk using real developer signals (error count, recent edits, LOC, etc.).
- Uses Gemini AI to explain risk and suggest fixes.
- Displays results via color-coded indicators inside VS Code.

#### 3.2.3 🏛️ High-level system architecture

```text
Developer (VS Code User)
        |
        v
VS Code Extension
  - Error detection (Diagnostics)
  - Build failure detection
  - Recent edit tracking
        |
        v
Error Session Manager
  - Starts session on first error
  - Groups errors within 1 minute
  - Ends session after inactivity
        |
        v
Backend Service (Node.js + Express)
  - Stores session data (PostgreSQL)
  - Sends structured data to Gemini AI
        |
        v
Gemini AI Risk Analyzer
  - Determines risk level
  - Explains error cause
  - Suggests fix steps
        |
        v
VS Code UI / Webview
  - Color-coded risk display
  - Explanations & guidance
```

#### 3.2.4 🔄 Error session logic

- **Error session** starts when the first error appears in a file.
- Any additional errors within **1 minute** of the last error are grouped into the same session.
- If no new error appears for >1 minute, the session closes and is sent for risk analysis.

Example:
- 08:00:00 – error in `FileA` → session starts.
- 08:00:40 – another error → session error count = 2.
- 08:01:40 – no new errors → session ends → data sent to Gemini → risk calculated and displayed.

#### 3.2.5 📦 Data collected per error session (per file)

- `file_uri` – unique file identifier.
- `loc` – lines of code.
- `error_count_session` – errors during the session.
- `insertions_15m`, `deletions_15m` – recent churn in the last 15 minutes.
- `all_error_messages` – error texts.
- `session_start_time`, `session_end_time`.

⚠️ **No source code content is sent to AI** – only metadata and error messages.

Typical payload to Gemini:

```json
{
  "file_uri": "...",
  "loc": 320,
  "error_count_session": 5,
  "insertions_15m": 42,
  "deletions_15m": 18,
  "all_error_messages": ["..."]
}
```

Gemini returns, for example:

```json
{
  "risk_level": "High",
  "color_code": "Red",
  "risk_explanation": "File is large and had many errors in a short time.",
  "error_explanation": "Errors likely caused by unstable recent changes.",
  "fix_steps": [
    "Review recent edits",
    "Refactor large functions",
    "Fix errors one by one"
  ]
}
```

#### 3.2.6 🎨 Risk visualization

Risk levels are mapped to colors and UI:

- Low – 🟢 Green: stable file.
- Medium – 🟡 Yellow: needs attention.
- High – 🔴 Red: high-priority fix.

Displayed via:
- Code Risk panel (webview) in the sidebar.
- Inline indicators and tooltips with explanations.

#### 3.2.7 🧩 Sub-features

- Error detection from VS Code Diagnostics.
- Build failure detection.
- Time-based error session grouping.
- Recent edit tracking (15-minute sliding window).
- File-level risk scoring.
- Gemini AI integration.
- Risk explanation and fix-step guidance.
- Color-coded UI visualization with live updates.

#### 3.2.8 🗄️ Database design (backend)

- `error_sessions` – stores per-session inputs sent to Gemini.
  - `session_id`, `file_uri`, `loc`, `error_count_session`, `insertions_15m`, `deletions_15m`, `session_start_time`, `session_end_time`, `all_error_messages`.
- `gemini_risk_results` – stores AI outputs used by the UI.
  - `result_id`, `session_id`, `file_uri`, `risk_level`, `color_code`, `risk_explanation`, `error_explanation`, `fix_steps`, `created_at`.

#### 3.2.9 👥 Privacy, target users, and status

- No source code content sent to AI; only structured metadata and error messages.
- Data stored securely in PostgreSQL; designed for **individual** developer use.
- Target users: undergraduates, freelancers, beginner-to-intermediate developers.
- Implementation status:
  - ✅ Error detection & session logic.
  - ✅ Backend & DB schema.
  - ✅ Gemini integration.
  - ✅ VS Code UI panel.
  - 🚧 UI polishing, advanced visualization, evaluation.


### 3.3 🔮 Forecasting & Planning Engine

This feature provides an **Intelligent Forecasting & Planning System** that predicts near-future productivity and helps developers create realistic, low-stress plans.

Instead of only showing past analytics, it focuses on:
- What is likely to happen **next** (1–7 days).
- Whether a user’s planned workload is **feasible**.
- How to plan work to avoid stress or burnout.

It is designed as an independent, modular system that consumes daily summary data produced by other Busy Bee modules.

#### 3.3.1 📋 Scope & responsibilities

This component **does not**:
- Collect raw VS Code events.
- Render past analytics dashboards.

It **only**:
- Reads daily summary tables from PostgreSQL.
- Performs forecasting, planning, and explanation.
- Exposes APIs for dashboards and chatbot UIs.

#### 3.3.2 🏗️ Architecture

```text
+----------------------------+
|   VS Code Extension UI     |
|  (Dashboard / Chatbot)     |
+-------------+--------------+
              |
              v
+----------------------------+
|     Backend API Layer      |
|   (Node.js + Express)      |
|                            |
| - /forecast                |
| - /insights                |
| - /explain                 |
| - /plan                    |
+-------------+--------------+
              |
              v
+----------------------------+
|     ML Service Layer       |
|   (Python + FastAPI)       |
|                            |
| - XGBoost model            |
| - Feature engineering      |
| - Explainability           |
+-------------+--------------+
              |
              v
+----------------------------+
|     PostgreSQL Database    |
|                            |
| - daily_focus_summary      |
| - daily_idle_summary       |
| - daily_error_summary      |
| - forecast_results         |
+----------------------------+
```

#### 3.3.3 📥 Data inputs

Daily aggregated tables (from Metrics Tracking and other modules):

- `daily_focus_summary`:
  - `date`, `total_focus_minutes`.
- `daily_idle_summary`:
  - `date`, `idle_minutes`, `day_idle_minutes`, `night_idle_minutes`.
- `daily_error_summary`:
  - `date`, `error_count`, `avg_error_fix_minutes`.

Synthetic data can be used during development to simulate realistic patterns.

#### 3.3.4 🧠 Machine learning design

- Model: **XGBoost Regression**.
- Forecast horizon: **1–7 days** (short term).
- Feature engineering:
  - Lagged focus values (previous days).
  - Rolling averages (e.g., 7-day window).
  - Idle time patterns and error-fix durations.
  - Day-of-week effects, weekends vs weekdays.
  - Day vs night work ratio.
- Outputs per day:
  - Predicted productive minutes.
  - Lower/upper confidence bounds.
  - Trend classification (rising/stable/falling).
  - Risk level (low/medium/high).
  - Confidence level (low/medium/high).
  - Best working window (day/night).

#### 3.3.5 💬 Explainability

- Uses XGBoost feature importance and local approximations.
- Provides **human-readable explanations**, not raw ML jargon.
- Explainability is surfaced **on demand**, via chatbot or detail panels, to avoid cognitive overload.

#### 3.3.6 📅 Planning & feasibility engine

Purpose: convert forecasts into **realistic, actionable plans**.

- Inputs:
  - Time period (day or week).
  - Target work hours.
- Logic:
  - Read latest forecast.
  - Apply confidence-based safety buffers.
  - Cap maximum hours per day.
  - Check feasibility; if infeasible, suggest a realistic target.
  - Generate per-day plan and recommended time windows.
- Output:
  - Feasible or not.
  - Suggested target hours.
  - Daily plan.
  - Best work window.
  - Chatbot-ready explanation.

#### 3.3.7 💭 Chatbot interaction design

The primary user interface is a **calm, supportive chatbot** in the dashboard webview.

Design principles:
- Supportive tone, no judgment.
- Minimal numbers unless requested.
- Guided options instead of free text.
- Avoid panic-inducing visuals.

Examples of user intents:
- “What’s my outlook?”
- “Plan my day/week.”
- “Why is confidence low?”
- “What influenced the forecast?”

#### 3.3.8 🖥️ Frontend integration

- Dashboard view (for supervisors/demos):
  - Forecast chart with confidence band.
  - Insight cards (trend, risk, confidence).
  - Explainability panel.
  - Planning preview.
- Chatbot view (for real users):
  - Conversational planning.
  - On-demand explanations.
  - Stress-aware interaction.

#### 3.3.9 🛠️ Technologies

- Backend: Node.js, Express, TypeScript.
- ML service: Python, FastAPI, XGBoost, Pandas, NumPy, Joblib.
- Database: PostgreSQL (Dockerized).
- Frontend: React, TypeScript, Tailwind CSS, Chart.js, VS Code Webview APIs.


### 3.4 ✔️ Intelligent TODO Tracker

The **Intelligent TODO Tracker** is a workspace-aware, contextual productivity feature for VS Code that turns simple `// TODO:` comments into **intelligent, persistent, project-aware tasks**.

It is a core component of Busy Bee, designed as part of a final-year BSc (Hons) IT research project with an emphasis on real-world workflows and extensibility.

#### 3.4.1 ❓ Problem statement

In real development:
- Developers rely on `TODO`, `FIXME`, and similar comments.
- These TODOs are unstructured, scattered, and often forgotten.
- Existing IDE tools:
  - Only list TODOs statically.
  - Do not understand project context or lifecycle.

This leads to accumulated technical debt and loss of context.

#### 3.4.2 💡 Solution overview

The tracker introduces:
- **Workspace-scoped** TODO management (project-specific, like Git repos).
- Automatic detection and tracking of TODO-style comments.
- Persistent lifecycle management of tasks (OPEN → RESOLVED → ARCHIVED).
- A dedicated VS Code sidebar dashboard for visibility.
- Backend-ready design for later AI/NLP enrichment.

It operates entirely inside the developer’s normal workflow; no change to how comments are written.

#### 3.4.3 🔍 System overview

High-level layers:

- Developer code (TODO comments).
- VS Code Extension (local intelligence).
- Webview dashboard (visualization).
- Backend services (optional for AI/NLP).

These layers are loosely coupled for robustness and extensibility.

#### 3.4.4 🏛️ Architecture

```text
VS Code Workspace
  - Source files with TODO comments

↓

VS Code Extension Layer
  - todoScanner
  - todoParser
  - todoStore
  - todoLifecycle
  - storageManager
  - workspace watchers

↓

Webview Dashboard (React)
  - TODO list visualization
  - Filters and actions
  - Sidebar UI

↓

Backend Services (Optional)
  - NLP services
  - Priority/urgency scoring
  - Task summarization
```

#### 3.4.5 ⚙️ Core sub-features

1. **Workspace-scoped TODO isolation**
   - TODOs are bound to the active workspace.
   - Switching projects automatically switches TODO datasets.

2. **Automatic TODO detection**
   - Scans for `TODO`, `FIXME`, `HACK`, etc.
   - Triggered on file save, editor change, and workspace folder changes.
   - Supports both full and incremental scans.

3. **Persistent TODO lifecycle management**
   - Each TODO moves through `OPEN → RESOLVED → ARCHIVED`.
   - State is persisted across VS Code sessions.

4. **Robust storage strategy**
   - Primary:
     - `<workspace>/.vscode/busy-bee-todo/todos.json`.
   - Fallback:
     - VS Code extension global storage, scoped by `projectId`.
   - Atomic writes and migration-aware schema.

5. **Event-driven synchronization**
   - Uses VS Code events (saves, focus changes, workspace changes).
   - No manual refresh required.

6. **Command Palette integration**
   - Commands such as:
     - `Busy Bee: TODO Scan Workspace`.
     - `Busy Bee: TODO Show Todos`.
     - `Busy Bee: TODO Mark Resolved`.

7. **Dedicated sidebar dashboard**
   - Integrated into the VS Code Activity Bar.
   - Shows TODO list, quick actions, and context.
   - Built with React, Vite, Tailwind, and VS Code theme tokens.

8. **Backend-ready AI/NLP integration**
   - Optional backend can provide priority scoring, urgency detection, and summarization.
   - Extension side remains responsive even if backend is offline.

#### 3.4.6 📂 Extension component structure

Example structure under an extension feature folder:

```text
features/todo-tracker/
  todoTracker.controller.ts   # central orchestrator
  todoScanner.ts              # file scanning logic
  todoParser.ts               # comment parsing
  todoStore.ts                # in-memory + persisted state
  todoLifecycle.ts            # task state transitions
  todoReminderEngine.ts       # contextual reminders
  todoFileAssociation.ts      # file relevance logic
  todoNlpClient.ts            # backend communication
  todo.constants.ts           # enums, constants
  todo.errors.ts              # domain-specific errors
  todo.telemetry.ts           # metrics and analytics hooks
```

#### 3.4.7 🔄 Usage flow

1. Open a workspace.
2. Add a comment such as `// TODO: improve error handling`.
3. Save the file; the tracker detects and parses the TODO.
4. Open the Busy Bee TODO Tracker view from the sidebar.
5. View, filter, and resolve TODOs.
6. Optionally trigger commands from the Command Palette.

#### 3.4.8 🧪 Testing, research contribution, and roadmap

- Tested with multiple workspaces, including restart persistence and fallback storage.
- Research contributions:
  - Workspace-aware task intelligence.
  - Bridge between developer behavior and task management.
  - Foundation for AI-driven task prioritization.
- Future enhancements:
  - ML-based priority prediction.
  - Deadline extraction via NLP.
  - Behavioral analytics and cross-session reminders.

> In the codebase, this feature lives primarily in the extension (tracking TODO comments) and dashboard (TODO view), with optional backend support.


## 4. 📦 Dependencies Overview

### 4.1 🏠 Root Workspace (busy-bee)

File: `package.json`

- Monorepo using npm workspaces: `"workspaces": ["packages/*"]`.
- Scripts:
  - `dev` – runs backend and dashboard together using `concurrently`.
  - `build` – builds extension, backend, and dashboard.
  - `build:extension` – builds dashboard for the extension via `scripts/build-dashboard.js`.
  - `dev:extension` – runs dashboard dev server for extension development.
- Dev dependencies:
  - `concurrently`, `prettier`, `typescript`.

### 4.2 ⚙️ Backend (`packages/backend/package.json`)

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

### 4.3 📊 Dashboard (`packages/dashboard/package.json`)

- Runtime dependencies:
  - `react`, `react-dom` – UI framework.
  - `chart.js`, `react-chartjs-2` – Charts for metrics visualization.
  - `lucide-react` – Icon set.
- Dev dependencies:
  - `vite` – bundler/dev server.
  - `tailwindcss`, `postcss`, `autoprefixer` – styling.
  - `eslint` + `typescript-eslint`, `@eslint/js` – linting.
  - `typescript`, `@types/react`, `@types/react-dom`, `@types/node`.

### 4.4 🧩 Extension (`packages/extension/package.json`)

- Runtime dependencies:
  - `axios` – HTTP client used from the extension to talk to the backend.
- Dev dependencies:
  - `@types/vscode` – VS Code API typings.
  - Testing: `@vscode/test-cli`, `@vscode/test-electron`, `@types/mocha`.
  - Build: `esbuild`, `npm-run-all`, `typescript` and `typescript-eslint`, `eslint`.


## 5. 📜 Project History (High-Level)

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


## 6. 📚 Included Guides & Documentation (Merged Content)

Below are the original guides merged into this single file for convenience.

---

### 6.1 🔐 GitHub Authentication Testing Guide (Extension)

> Source: `GITHUB_AUTH_TESTING.md`

#### 📖 Overview
The Busy Bee extension now requires GitHub authentication to track file switching metrics. All data is associated with the authenticated GitHub user.

#### 🏗️ System Architecture

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

#### 🧪 Testing Steps

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

#### ✨ Expected Behavior

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

#### 🔌 API Testing with cURL

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

#### 🔧 Troubleshooting

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

#### 🔍 GitHub User ID Lookup

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

### 6.2 🔑 GitHub OAuth Setup Guide (Dashboard + Backend)

> Source: `GITHUB_OAUTH_SETUP.md`

This guide describes setting up GitHub OAuth for:
- VS Code extension (built-in, already working).
- Dashboard (manual GitHub OAuth app).

#### 📖 Overview

**VS Code Extension (Built-in Auth)**
- Uses VS Code’s built-in GitHub provider.
- No OAuth app registration required.
- Token managed by VS Code.

**Dashboard (Manual OAuth App)**
- Requires a GitHub OAuth App.
- Uses standard OAuth 2.0 authorization code flow.
- Backend handles code→token exchange.
- Dashboard stores token in browser localStorage.

#### 🧩 Part 1: Extension

Already working – just run:
1. Cmd/Ctrl+Shift+P.
2. `Busy Bee: Sign in with GitHub`.
3. Authorize in browser.

#### 📊 Part 2: Dashboard OAuth Setup

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

#### 🧪 Testing Dashboard Authentication

1. Open `http://localhost:5173`.
2. Click **Sign in with GitHub**.
3. Authorize, then return to dashboard.
4. Verify:
   - Avatar + username in header.
   - File Switch page now filtered by your user.
   - Sign Out works.

#### 🚀 Production Deployment

- Create a production OAuth App with:
  ```
  Homepage URL: https://yourdomain.com
  Authorization callback URL: https://yourdomain.com/auth/callback
  ```
- Update backend `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
- Update dashboard `VITE_GITHUB_CLIENT_ID` / `VITE_GITHUB_REDIRECT_URI`.
- Keep secrets out of git; use environment management.

#### 🔧 Troubleshooting

- **"OAuth not configured"** – ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set and backend restarted.
- **"Failed to exchange code for token"** – verify client secret & redirect URI; ensure backend on `http://localhost:4000`.
- **Redirect loop / "Invalid OAuth state"** – clear browser localStorage; try again; check console.
- **CORS errors** – verify backend CORS; backend on `http://localhost:4000` and dashboard on `http://localhost:5173`.

#### 🔒 Security Best Practices

- Never commit `.env` files; use `.env.example` templates.
- Use separate OAuth apps for dev and prod.
- Rotate secrets regularly and limit scopes (`user:email`, `read:user`).

#### 🏛️ Architecture Overview

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

### 6.3 🎨 VS Code Theme Integration – Implementation Summary

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

### 6.4 ⚙️ Backend – Feature Overview & File Switch Tracking

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

### 6.5 🧩 Extension – Busy Bee VS Code Extension Overview

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

### 6.6 📊 Dashboard – Package Overview

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

### 6.7 🎨 Color Migration & VS Code Theme Integration Details

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

### 6.8 🚀 Extension Quickstart & Changelog

> Sources: `packages/extension/vsc-extension-quickstart.md`, `packages/extension/CHANGELOG.md`

- Quickstart describes how to:
  - Press F5 to open Extension Development Host.
  - Run the Hello World command.
  - Debug `extension.ts` and run tests using VS Code test runner.
- Changelog currently records an initial “Unreleased / Initial release”.


## 7. 📖 How to Use This Document

- Use **Sections 1–3** for a conceptual overview (project, architecture, main features including Code Risk & Metrics Tracking).
- Use **Section 4** to understand dependencies across packages.
- Use **Section 5** for a narrative project history.
- Use **Section 6** as a single place to read all of the original guides you attached.

If you’d like, I can next:
- Add a short "Getting Started for New Developers" section summarizing how to run all services together, or
- Expand the Code Risk and Metrics Tracking sections with more specific details by scanning those feature folders in the code. 