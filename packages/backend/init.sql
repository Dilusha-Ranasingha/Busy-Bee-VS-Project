-- =====================================================
-- Busy Bee - Database Initialization
-- Runs automatically ONLY when the Postgres volume is new
-- =====================================================


-- =====================================================
-- SAMPLE FEATURE (KEEP AS IS)
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  description TEXT DEFAULT '',
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- File switching metric windows
CREATE TABLE IF NOT EXISTS file_switch_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL,                -- GitHub user ID
CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at DESC);


-- =====================================================
-- MEMBER 01 OUTPUT (ASSUMED TABLE)
-- Daily Focus Summary (your ML input)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_focus_summary (
    user_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,

    total_focus_minutes INTEGER NOT NULL,

    max_focus_streak_min INTEGER,
    avg_focus_streak_min INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_daily_focus_summary PRIMARY KEY (user_id, date)
);


-- =====================================================
-- FORECASTING MODULE OUTPUT
-- ML Predictions table
-- =====================================================

CREATE TABLE IF NOT EXISTS forecast_daily_productivity (
    id SERIAL PRIMARY KEY,

    user_id VARCHAR(100) NOT NULL,
    target_date DATE NOT NULL,

    predicted_focus_minutes INTEGER NOT NULL,

    lower_bound INTEGER,
    upper_bound INTEGER,

    model_version VARCHAR(50),
    horizon_days INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicates for same user/day/model/horizon
CREATE UNIQUE INDEX IF NOT EXISTS uq_forecast_user_date_model_horizon
ON forecast_daily_productivity(user_id, target_date, model_version, horizon_days);


-- =====================================================
-- KPI PLACEHOLDER TABLE #1 (Idle sessions)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_idle_summary (
    user_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,

    idle_minutes NUMERIC(6,1) NOT NULL DEFAULT 0,
    idle_sessions INTEGER NOT NULL DEFAULT 0,
    avg_idle_session_min NUMERIC(5,1) NOT NULL DEFAULT 0,
    longest_idle_session_min NUMERIC(5,1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_daily_idle_summary PRIMARY KEY (user_id, date)
);


-- =====================================================
-- KPI PLACEHOLDER TABLE #2 (Error fix sessions)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_error_summary (
    user_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,

    error_count INTEGER NOT NULL DEFAULT 0,
    avg_fix_time_min NUMERIC(5,1) NOT NULL DEFAULT 0,
    total_fix_time_min NUMERIC(6,1) NOT NULL DEFAULT 0,
    long_fix_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_daily_error_summary PRIMARY KEY (user_id, date)
);


-- =====================================================
-- KPI PLACEHOLDER TABLE #3 (Time-of-day focus)
-- This is the "day vs night focus" table you asked for
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_time_focus_summary (
    user_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,

    day_focus_minutes INTEGER NOT NULL DEFAULT 0,
    night_focus_minutes INTEGER NOT NULL DEFAULT 0,

    day_sessions INTEGER NOT NULL DEFAULT 0,
    night_sessions INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_daily_time_focus_summary PRIMARY KEY (user_id, date)
);


-- =====================================================
-- SEED DATA (30 days) - testUser
-- Enough history for lags + rolling features
-- =====================================================

-- Focus seed: 2025-12-01 .. 2025-12-30
INSERT INTO daily_focus_summary (
    user_id, date, total_focus_minutes, max_focus_streak_min, avg_focus_streak_min
)
SELECT
  'testUser' AS user_id,
  d::date AS date,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 85
      ELSE 120 + (EXTRACT(DOW FROM d)::int * 4)
    END
  )::int AS total_focus_minutes,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 30
      ELSE 45 + (EXTRACT(DOW FROM d)::int * 2)
    END
  )::int AS max_focus_streak_min,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 18
      ELSE 22 + (EXTRACT(DOW FROM d)::int)
    END
  )::int AS avg_focus_streak_min
FROM generate_series('2025-12-01'::date, '2025-12-30'::date, interval '1 day') AS d
ON CONFLICT (user_id, date) DO NOTHING;


-- Idle seed
INSERT INTO daily_idle_summary (
    user_id, date, idle_minutes, idle_sessions, avg_idle_session_min, longest_idle_session_min
)
SELECT
  'testUser' AS user_id,
  d::date AS date,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 70 + (EXTRACT(DOW FROM d)::int * 2)
      ELSE 35 + (EXTRACT(DOW FROM d)::int * 3)
    END
  )::numeric(6,1) AS idle_minutes,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 5
      ELSE 3
    END
  )::int AS idle_sessions,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 14.0
      ELSE 9.5
    END
  )::numeric(5,1) AS avg_idle_session_min,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 35.0
      ELSE 22.0
    END
  )::numeric(5,1) AS longest_idle_session_min
FROM generate_series('2025-12-01'::date, '2025-12-30'::date, interval '1 day') AS d
ON CONFLICT (user_id, date) DO NOTHING;


-- Error seed
INSERT INTO daily_error_summary (
    user_id, date, error_count, avg_fix_time_min, total_fix_time_min, long_fix_count
)
SELECT
  'testUser' AS user_id,
  d::date AS date,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 1
      WHEN EXTRACT(DOW FROM d) IN (2,3) THEN 4
      ELSE 2
    END
  )::int AS error_count,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (2,3) THEN 11.0
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 6.0
      ELSE 8.0
    END
  )::numeric(5,1) AS avg_fix_time_min,
  (
    (
      CASE
        WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 1
        WHEN EXTRACT(DOW FROM d) IN (2,3) THEN 4
        ELSE 2
      END
    ) *
    (
      CASE
        WHEN EXTRACT(DOW FROM d) IN (2,3) THEN 11.0
        WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 6.0
        ELSE 8.0
      END
    )
  )::numeric(6,1) AS total_fix_time_min,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (2,3) THEN 2
      ELSE 0
    END
  )::int AS long_fix_count
FROM generate_series('2025-12-01'::date, '2025-12-30'::date, interval '1 day') AS d
ON CONFLICT (user_id, date) DO NOTHING;


-- Time-of-day seed (day vs night)
-- We simulate that weekdays have more day-focus; weekends more night-focus.
INSERT INTO daily_time_focus_summary (
    user_id, date, day_focus_minutes, night_focus_minutes, day_sessions, night_sessions
)
SELECT
  'testUser' AS user_id,
  d::date AS date,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 30
      ELSE 80 + (EXTRACT(DOW FROM d)::int * 3)
    END
  )::int AS day_focus_minutes,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 55
      ELSE 40 + (EXTRACT(DOW FROM d)::int * 1)
    END
  )::int AS night_focus_minutes,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 1
      ELSE 3
    END
  )::int AS day_sessions,
  (
    CASE
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 3
      ELSE 2
    END
  )::int AS night_sessions
FROM generate_series('2025-12-01'::date, '2025-12-30'::date, interval '1 day') AS d
ON CONFLICT (user_id, date) DO NOTHING;


-- =====================================================
-- DETAILED TRACKING TABLES (Raw Event Data)
-- These tables store session-level events that feed into the daily summaries above
-- =====================================================

-- Enable uuid generation for detailed tracking tables
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- File Switching Metrics (Session Windows)
-- =====================================================
CREATE TABLE IF NOT EXISTS file_switch_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end   TIMESTAMPTZ NOT NULL,

  -- Your rule: count activations including returning to same file
  activation_count INT NOT NULL CHECK (activation_count >= 0),

  -- Convenience field: activation_count / windowMinutes
  rate_per_min NUMERIC(10, 4) NOT NULL CHECK (rate_per_min >= 0),

  workspace_tag TEXT NULL,

  activation_count INT NOT NULL CHECK (activation_count >= 0),
  rate_per_min NUMERIC(10, 4) NOT NULL CHECK (rate_per_min >= 0),

  workspace_tag TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_switch_windows_session
  ON file_switch_windows (session_id, window_start);

CREATE INDEX IF NOT EXISTS idx_file_switch_windows_created_at
  ON file_switch_windows (created_at);

CREATE INDEX IF NOT EXISTS idx_file_switch_windows_user_id
  ON file_switch_windows (user_id, created_at DESC);

-- Focus Streaks table
CREATE INDEX IF NOT EXISTS idx_file_switch_windows_created_at
  ON file_switch_windows (created_at);
CREATE INDEX IF NOT EXISTS idx_file_switch_windows_user_id
  ON file_switch_windows (user_id, created_at DESC);

-- =====================================================
-- Focus Streaks (Global and Per-File)
-- =====================================================
CREATE TABLE IF NOT EXISTS focus_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('global', 'per_file')),
  
  -- Per-file specific fields (nullable for global streaks)
  file_hash TEXT,
  language TEXT,
  
  -- Timing
  file_hash TEXT,
  language TEXT,
  
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_min NUMERIC NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_streaks_user_type ON focus_streaks(user_id, type, duration_min DESC);
CREATE INDEX IF NOT EXISTS idx_focus_streaks_user_language ON focus_streaks(user_id, language, duration_min DESC);
CREATE INDEX IF NOT EXISTS idx_focus_streaks_start ON focus_streaks(start_ts DESC);

-- Edit Sessions table (Edits per Minute tracking)
-- =====================================================
-- Edit Sessions (Edits per Minute tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- Session timing
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_min NUMERIC NOT NULL,
  
  -- Core metrics
  edits_per_min NUMERIC NOT NULL,
  insert_chars_per_min NUMERIC NOT NULL,
  delete_chars_per_min NUMERIC NOT NULL,
  add_delete_ratio NUMERIC NOT NULL,
  
  -- Total counts (for reference)
  total_edits INT NOT NULL,
  total_insert_chars INT NOT NULL,
  total_delete_chars INT NOT NULL,
  
  -- Optional shape metrics
  typing_burstiness_index NUMERIC,
  burst_count INT,
  avg_burst_len_sec NUMERIC,
  longest_pause_min NUMERIC,
  paste_events INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_edits_user_edits ON sessions_edits(user_id, edits_per_min DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_edits_start ON sessions_edits(start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_edits_session ON sessions_edits(session_id);

-- Save-to-Edit Ratio Sessions table
-- =====================================================
-- Save-to-Edit Ratio Sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS save_edit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- Session timing
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_min NUMERIC NOT NULL,
  
  -- Edit counts
  edits_total INT NOT NULL,
  
  -- Raw save counts
  edits_total INT NOT NULL,
  
  saves_manual INT NOT NULL,
  saves_autosave_delay INT NOT NULL,
  saves_autosave_focusout INT NOT NULL,
  
  -- Processed save counts
  autosaves_effective INT NOT NULL,
  checkpoint_autosave_count INT NOT NULL,
  
  -- Ratios
  autosaves_effective INT NOT NULL,
  checkpoint_autosave_count INT NOT NULL,
  
  save_to_edit_ratio_manual NUMERIC NOT NULL,
  save_to_edit_ratio_autosave NUMERIC NOT NULL,
  effective_save_to_edit_ratio NUMERIC NOT NULL,
  
  -- Spacing metrics
  avg_secs_between_saves NUMERIC,
  median_secs_between_saves NUMERIC,
  
  -- Context
  avg_secs_between_saves NUMERIC,
  median_secs_between_saves NUMERIC,
  
  manual_save_share NUMERIC,
  collapse_window_sec INT DEFAULT 60,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_save_edit_sessions_user_ratio ON save_edit_sessions(user_id, effective_save_to_edit_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_save_edit_sessions_start ON save_edit_sessions(start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_save_edit_sessions_session ON save_edit_sessions(session_id);

-- Diagnostic Density Sessions (session-based: start when errors appear, end when resolved)
-- =====================================================
-- Diagnostic Density Sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS diagnostic_density_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  workspace_id TEXT,
  
  file_hash TEXT NOT NULL,
  language TEXT,
  
  -- Session timing
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_min NUMERIC(10, 2) NOT NULL CHECK (duration_min >= 0),
  
  -- Peak metrics during session (highest error count)
  peak_line_count INT NOT NULL CHECK (peak_line_count >= 0),
  peak_errors INT NOT NULL CHECK (peak_errors >= 0),
  peak_warnings INT NOT NULL CHECK (peak_warnings >= 0),
  peak_density_per_kloc NUMERIC(10, 4) NOT NULL CHECK (peak_density_per_kloc >= 0),
  
  -- Final state when session ended (errors became 0)
  final_line_count INT NOT NULL CHECK (final_line_count >= 0),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_diagnostic_density_sessions_user ON diagnostic_density_sessions(user_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_density_sessions_highest ON diagnostic_density_sessions(user_id, peak_density_per_kloc DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_density_sessions_session ON diagnostic_density_sessions(session_id);

-- Error Fix Time Sessions (per-error tracking: appearance to resolution)
-- =====================================================
-- Error Fix Time Sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS error_fix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  
  file_hash TEXT NOT NULL,
  language TEXT,
  
  -- Error identity
  error_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning')),
  
  -- Session timing
  error_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning')),
  
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_sec INT NOT NULL CHECK (duration_sec >= 60),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error fix queries
CREATE INDEX IF NOT EXISTS idx_error_fix_sessions_user ON error_fix_sessions(user_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_error_fix_sessions_duration ON error_fix_sessions(user_id, duration_sec DESC);
CREATE INDEX IF NOT EXISTS idx_error_fix_sessions_severity ON error_fix_sessions(user_id, severity);

-- Task Runs (Build/Test) - Per-Run Tracking with Live Counters
-- =====================================================
-- Task Runs (Build/Test)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- Task identification
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('test', 'build')),
  
  -- Timing
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('test', 'build')),
  
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_sec INT NOT NULL,
  
  -- Result
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'cancelled')),
  
  -- Optional metadata
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'cancelled')),
  
  pid INT,
  is_watch_like BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for task run queries
CREATE INDEX IF NOT EXISTS idx_task_runs_user ON task_runs(user_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_task_runs_kind ON task_runs(user_id, kind, result);
CREATE INDEX IF NOT EXISTS idx_task_runs_result ON task_runs(user_id, result);

-- Commit-per-Edit Sessions (Edits before Commit)
-- =====================================================
-- Commit-per-Edit Sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS commit_edit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- Timing
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  time_to_commit_min NUMERIC NOT NULL,
  
  -- Edit metrics
  edits_per_commit INT NOT NULL CHECK (edits_per_commit > 0),
  chars_added_per_commit INT NOT NULL DEFAULT 0,
  chars_deleted_per_commit INT NOT NULL DEFAULT 0,
  
  -- Commit metadata
  files_in_commit INT NOT NULL DEFAULT 0,
  lines_added INT,
  lines_deleted INT,
  repo_id TEXT,
  commit_sha TEXT,
  
  -- Status
  aborted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for commit-edit session queries
CREATE INDEX IF NOT EXISTS idx_commit_edit_sessions_user ON commit_edit_sessions(user_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_commit_edit_sessions_edits ON commit_edit_sessions(user_id, edits_per_commit DESC);
CREATE INDEX IF NOT EXISTS idx_commit_edit_sessions_today ON commit_edit_sessions(user_id, start_ts) WHERE aborted = FALSE;

-- ============================================================
-- 9) Idle Sessions (Distraction Detection)
-- ============================================================
-- =====================================================
-- Idle Sessions (Distraction Detection)
-- =====================================================
CREATE TABLE IF NOT EXISTS idle_sessions (
  id SERIAL PRIMARY KEY,
  
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- Timing
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  duration_min NUMERIC NOT NULL CHECK (duration_min >= 15),
  
  -- Configuration
  threshold_min INT NOT NULL DEFAULT 15,
  
  -- Optional metadata
  ended_reason TEXT, -- 'activity', 'vscode_close', 'os_sleep_wake'
  threshold_min INT NOT NULL DEFAULT 15,
  
  ended_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for idle session queries
CREATE INDEX IF NOT EXISTS idx_idle_sessions_user ON idle_sessions(user_id, start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_idle_sessions_duration ON idle_sessions(user_id, duration_min DESC);
CREATE INDEX IF NOT EXISTS idx_idle_sessions_shortest ON idle_sessions(user_id, duration_min ASC);

-- ============================================================
-- 10) Daily Metrics (Aggregated Summary per User per Day)
-- ============================================================
-- =====================================================
-- Daily Metrics (Comprehensive Aggregation)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  user_id  TEXT NOT NULL,
  date     DATE NOT NULL,
  file_switch           JSONB NOT NULL,
  focus_streak          JSONB NOT NULL,
  edits_per_min         JSONB NOT NULL,
  saves_to_edit_ratio   JSONB NOT NULL,
  diagnostics_per_kloc  JSONB NOT NULL,
  error_fix             JSONB NOT NULL,
  tasks                 JSONB NOT NULL,
  commits               JSONB NOT NULL,
  idle                  JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);

-- ============================================================
-- Daily Metrics Aggregation Function (Single User, Single Day)
-- ============================================================

-- =====================================================
-- AGGREGATION FUNCTIONS
-- Populate daily summary tables from detailed tracking tables
-- =====================================================

-- Function to update daily_focus_summary from focus_streaks
CREATE OR REPLACE FUNCTION update_daily_focus_summary(p_user_id TEXT, p_date DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_focus_summary (
    user_id, date, total_focus_minutes, max_focus_streak_min, avg_focus_streak_min
  )
  SELECT
    p_user_id,
    p_date,
    COALESCE(SUM(duration_min), 0)::INTEGER AS total_focus_minutes,
    COALESCE(MAX(duration_min), 0)::INTEGER AS max_focus_streak_min,
    COALESCE(AVG(duration_min), 0)::INTEGER AS avg_focus_streak_min
  FROM focus_streaks
  WHERE user_id = p_user_id
    AND start_ts >= p_date::TIMESTAMPTZ
    AND start_ts < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
    AND type = 'global'
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_focus_minutes = EXCLUDED.total_focus_minutes,
    max_focus_streak_min = EXCLUDED.max_focus_streak_min,
    avg_focus_streak_min = EXCLUDED.avg_focus_streak_min,
    created_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function to update daily_idle_summary from idle_sessions
CREATE OR REPLACE FUNCTION update_daily_idle_summary(p_user_id TEXT, p_date DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_idle_summary (
    user_id, date, idle_minutes, idle_sessions, avg_idle_session_min, longest_idle_session_min
  )
  SELECT
    p_user_id,
    p_date,
    COALESCE(SUM(duration_min), 0)::NUMERIC(6,1) AS idle_minutes,
    COUNT(*)::INTEGER AS idle_sessions,
    COALESCE(AVG(duration_min), 0)::NUMERIC(5,1) AS avg_idle_session_min,
    COALESCE(MAX(duration_min), 0)::NUMERIC(5,1) AS longest_idle_session_min
  FROM idle_sessions
  WHERE user_id = p_user_id
    AND start_ts >= p_date::TIMESTAMPTZ
    AND start_ts < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    idle_minutes = EXCLUDED.idle_minutes,
    idle_sessions = EXCLUDED.idle_sessions,
    avg_idle_session_min = EXCLUDED.avg_idle_session_min,
    longest_idle_session_min = EXCLUDED.longest_idle_session_min,
    created_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function to update daily_error_summary from error_fix_sessions
CREATE OR REPLACE FUNCTION update_daily_error_summary(p_user_id TEXT, p_date DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_error_summary (
    user_id, date, error_count, avg_fix_time_min, total_fix_time_min, long_fix_count
  )
  SELECT
    p_user_id,
    p_date,
    COUNT(*)::INTEGER AS error_count,
    COALESCE(AVG(duration_sec / 60.0), 0)::NUMERIC(5,1) AS avg_fix_time_min,
    COALESCE(SUM(duration_sec / 60.0), 0)::NUMERIC(6,1) AS total_fix_time_min,
    SUM(CASE WHEN duration_sec > 600 THEN 1 ELSE 0 END)::INTEGER AS long_fix_count
  FROM error_fix_sessions
  WHERE user_id = p_user_id
    AND end_ts >= p_date::TIMESTAMPTZ
    AND end_ts < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
    AND severity = 'error'
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    error_count = EXCLUDED.error_count,
    avg_fix_time_min = EXCLUDED.avg_fix_time_min,
    total_fix_time_min = EXCLUDED.total_fix_time_min,
    long_fix_count = EXCLUDED.long_fix_count,
    created_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function to update daily_time_focus_summary from focus_streaks
CREATE OR REPLACE FUNCTION update_daily_time_focus_summary(p_user_id TEXT, p_date DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_time_focus_summary (
    user_id, date, day_focus_minutes, night_focus_minutes, day_sessions, night_sessions
  )
  SELECT
    p_user_id,
    p_date,
    COALESCE(SUM(CASE 
      WHEN EXTRACT(HOUR FROM start_ts) >= 6 AND EXTRACT(HOUR FROM start_ts) < 18 
      THEN duration_min ELSE 0 END), 0)::INTEGER AS day_focus_minutes,
    COALESCE(SUM(CASE 
      WHEN EXTRACT(HOUR FROM start_ts) < 6 OR EXTRACT(HOUR FROM start_ts) >= 18 
      THEN duration_min ELSE 0 END), 0)::INTEGER AS night_focus_minutes,
    COUNT(CASE 
      WHEN EXTRACT(HOUR FROM start_ts) >= 6 AND EXTRACT(HOUR FROM start_ts) < 18 
      THEN 1 END)::INTEGER AS day_sessions,
    COUNT(CASE 
      WHEN EXTRACT(HOUR FROM start_ts) < 6 OR EXTRACT(HOUR FROM start_ts) >= 18 
      THEN 1 END)::INTEGER AS night_sessions
  FROM focus_streaks
  WHERE user_id = p_user_id
    AND start_ts >= p_date::TIMESTAMPTZ
    AND start_ts < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
    AND type = 'global'
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    day_focus_minutes = EXCLUDED.day_focus_minutes,
    night_focus_minutes = EXCLUDED.night_focus_minutes,
    day_sessions = EXCLUDED.day_sessions,
    night_sessions = EXCLUDED.night_sessions,
    created_at = CURRENT_TIMESTAMP;
END;
$$;

-- Master function to update all daily summaries
CREATE OR REPLACE FUNCTION update_all_daily_summaries(p_user_id TEXT, p_date DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM update_daily_focus_summary(p_user_id, p_date);
  PERFORM update_daily_idle_summary(p_user_id, p_date);
  PERFORM update_daily_error_summary(p_user_id, p_date);
  PERFORM update_daily_time_focus_summary(p_user_id, p_date);
END;
$$;


-- =====================================================
-- DAILY METRICS AGGREGATION (Comprehensive)
-- =====================================================

CREATE OR REPLACE FUNCTION make_daily_metrics(p_user_id TEXT, p_day DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  WITH
  bounds AS (
    SELECT p_day::date AS day, (p_day + INTERVAL '1 day')::date AS day_next
  ),

  -- 1) File switch
  file_switch AS (
    SELECT
      AVG(rate_per_min)::numeric(10,4) AS file_switch_rate_avg,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rate_per_min)::numeric(10,4) AS file_switch_rate_p95,
      SUM(activation_count) AS file_switch_count_total,
      COUNT(*) AS file_switch_sessions
    FROM file_switch_windows f, bounds b
    WHERE f.user_id = p_user_id
      AND f.window_start >= b.day AND f.window_start < b.day_next
  ),

  -- 2) Focus streaks
  focus AS (
    SELECT
      MAX(CASE WHEN type='global'   THEN duration_min END)::numeric AS global_focus_streak_max_min,
      MAX(CASE WHEN type='per_file' THEN duration_min END)::numeric AS per_file_focus_streak_max_min
    FROM focus_streaks s, bounds b
    WHERE s.user_id = p_user_id
      AND s.start_ts >= b.day AND s.start_ts < b.day_next
  ),

  -- 3) Edits per minute
  edits AS (
    SELECT
      AVG(edits_per_min)::numeric(10,2) AS edits_per_min_avg,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY edits_per_min)::numeric(10,2) AS edits_per_min_p95,
      AVG(typing_burstiness_index)::numeric(10,3) AS typing_burstiness_index_avg,
      COALESCE(SUM(paste_events),0) AS paste_events_total,
      COALESCE(SUM(duration_min),0)::numeric(10,2) AS active_time_min_from_edits
    FROM sessions_edits e, bounds b
    WHERE e.user_id = p_user_id
      AND e.start_ts >= b.day AND e.start_ts < b.day_next
  ),

  -- 4) Saves to edit ratio
  saves AS (
    SELECT
      AVG(save_to_edit_ratio_manual)::numeric(10,4) AS save_to_edit_ratio_manual_avg,
      AVG(effective_save_to_edit_ratio)::numeric(10,4) AS effective_save_to_edit_ratio_avg,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY median_secs_between_saves)::numeric(10,2) AS median_secs_between_saves,
      COALESCE(SUM(checkpoint_autosave_count),0) AS checkpoint_autosave_count_total
    FROM save_edit_sessions s, bounds b
    WHERE s.user_id = p_user_id
      AND s.start_ts >= b.day AND s.start_ts < b.day_next
  ),

  -- 5) Diagnostics per KLOC
  diag AS (
    SELECT
      AVG(peak_density_per_kloc)::numeric(10,2) AS diagnostics_density_avg_per_kloc,
      MAX(peak_density_per_kloc)::numeric(10,2) AS diagnostics_hotspot_max_per_kloc
    FROM diagnostic_density_sessions d, bounds b
    WHERE d.user_id = p_user_id
      AND d.start_ts >= b.day AND d.start_ts < b.day_next
  ),

  -- 6) Error fix (count by when it finished)
  fix AS (
    SELECT
      COUNT(*) AS fixes_count,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_sec)/60.0)::numeric(10,2) AS median_active_fix_time_min,
      (MIN(duration_sec)/60.0)::numeric(10,2) AS min_active_fix_time_min
    FROM error_fix_sessions e, bounds b
    WHERE e.user_id = p_user_id
      AND e.end_ts >= b.day AND e.end_ts < b.day_next
  ),

  -- 7) Task runs
  tasks AS (
    SELECT
      SUM(CASE WHEN kind='test'  AND result IN ('pass','fail') THEN 1 ELSE 0 END) AS test_runs,
      SUM(CASE WHEN kind='build' AND result IN ('pass','fail') THEN 1 ELSE 0 END) AS build_runs,
      (
        SUM(CASE WHEN result='pass' THEN 1 ELSE 0 END)::float
        / NULLIF(SUM(CASE WHEN result IN ('pass','fail') THEN 1 ELSE 0 END),0)
      ) AS overall_pass_rate,
      AVG(CASE WHEN kind='test' AND result <> 'cancelled' THEN duration_sec END) AS avg_test_duration_sec
    FROM task_runs t, bounds b
    WHERE t.user_id = p_user_id
      AND t.start_ts >= b.day AND t.start_ts < b.day_next
  ),

  -- 8) Commit cadence (plus best commits in any hour)
  commits_base AS (
    SELECT c.*, 
           EXTRACT(EPOCH FROM (c.end_ts - LAG(c.end_ts) OVER (ORDER BY c.end_ts)))/60.0 AS gap_min
    FROM commit_edit_sessions c, bounds b
    WHERE c.user_id = p_user_id
      AND c.end_ts >= b.day AND c.end_ts < b.day_next
      AND c.aborted = FALSE
  ),
  commits AS (
    SELECT
      COUNT(*) AS commits_total,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_min))::numeric(10,2) AS median_mins_between_commits,
      AVG(edits_per_commit)::numeric(10,2) AS avg_edits_per_commit
    FROM commits_base
  ),
  best_hour AS (
    SELECT COALESCE(MAX(cnt),0) AS best_commits_in_any_hour
    FROM (
      SELECT COUNT(*) OVER (
        ORDER BY end_ts
        RANGE BETWEEN INTERVAL '60 minutes' PRECEDING AND CURRENT ROW
      ) AS cnt
      FROM commits_base
    ) w
  ),

  -- 9) Idle
  idle AS (
    SELECT
      COALESCE(SUM(duration_min),0)::numeric(10,2) AS idle_time_min_total,
      COUNT(*) AS idle_sessions_count
    FROM idle_sessions i, bounds b
    WHERE i.user_id = p_user_id
      AND i.start_ts >= b.day AND i.start_ts < b.day_next
  )

  INSERT INTO daily_metrics (
    user_id, date,
    file_switch, focus_streak, edits_per_min, saves_to_edit_ratio,
    diagnostics_per_kloc, error_fix, tasks, commits, idle
  )
  VALUES (
    p_user_id, p_day,

    -- file_switch
    JSONB_BUILD_OBJECT(
      'file_switch_rate_avg',      (SELECT file_switch_rate_avg      FROM file_switch),
      'file_switch_rate_p95',      (SELECT file_switch_rate_p95      FROM file_switch),
      'file_switch_count_total',   (SELECT file_switch_count_total   FROM file_switch),
      'file_switch_sessions',      (SELECT file_switch_sessions      FROM file_switch)
    ),

    -- focus_streak
    JSONB_BUILD_OBJECT(
      'global_focus_streak_max_min',  (SELECT global_focus_streak_max_min   FROM focus),
      'per_file_focus_streak_max_min',(SELECT per_file_focus_streak_max_min FROM focus)
    ),

    -- edits_per_min
    JSONB_BUILD_OBJECT(
      'edits_per_min_avg',           (SELECT edits_per_min_avg            FROM edits),
      'edits_per_min_p95',           (SELECT edits_per_min_p95            FROM edits),
      'typing_burstiness_index_avg', (SELECT typing_burstiness_index_avg  FROM edits),
      'paste_events_total',          (SELECT paste_events_total           FROM edits),
      'active_time_min_from_edits',  (SELECT active_time_min_from_edits   FROM edits)
    ),

    -- saves_to_edit_ratio
    JSONB_BUILD_OBJECT(
      'save_to_edit_ratio_manual_avg',    (SELECT save_to_edit_ratio_manual_avg   FROM saves),
      'effective_save_to_edit_ratio_avg', (SELECT effective_save_to_edit_ratio_avg FROM saves),
      'median_secs_between_saves',        (SELECT median_secs_between_saves        FROM saves),
      'checkpoint_autosave_count_total',  (SELECT checkpoint_autosave_count_total  FROM saves)
    ),

    -- diagnostics_per_kloc
    JSONB_BUILD_OBJECT(
      'diagnostics_density_avg_per_kloc', (SELECT diagnostics_density_avg_per_kloc FROM diag),
      'diagnostics_hotspot_max_per_kloc', (SELECT diagnostics_hotspot_max_per_kloc FROM diag)
    ),

    -- error_fix
    JSONB_BUILD_OBJECT(
      'fixes_count',                    (SELECT fixes_count                    FROM fix),
      'median_active_fix_time_min',     (SELECT median_active_fix_time_min     FROM fix),
      'min_active_fix_time_min',        (SELECT min_active_fix_time_min        FROM fix)
    ),

    -- tasks
    JSONB_BUILD_OBJECT(
      'test_runs',                      (SELECT test_runs                      FROM tasks),
      'build_runs',                     (SELECT build_runs                     FROM tasks),
      'overall_pass_rate',              (SELECT overall_pass_rate              FROM tasks),
      'avg_test_duration_sec',          (SELECT avg_test_duration_sec          FROM tasks)
    ),

    -- commits
    JSONB_BUILD_OBJECT(
      'commits_total',                  (SELECT commits_total                  FROM commits),
      'median_mins_between_commits',    (SELECT median_mins_between_commits    FROM commits),
      'best_commits_in_any_hour',       (SELECT best_commits_in_any_hour       FROM best_hour),
      'avg_edits_per_commit',           (SELECT avg_edits_per_commit           FROM commits)
    ),

    -- idle
    JSONB_BUILD_OBJECT(
      'idle_time_min_total',            (SELECT idle_time_min_total            FROM idle),
      'idle_sessions_count',            (SELECT idle_sessions_count            FROM idle)
    )
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    file_switch          = EXCLUDED.file_switch,
    focus_streak         = EXCLUDED.focus_streak,
    edits_per_min        = EXCLUDED.edits_per_min,
    saves_to_edit_ratio  = EXCLUDED.saves_to_edit_ratio,
    diagnostics_per_kloc = EXCLUDED.diagnostics_per_kloc,
    error_fix            = EXCLUDED.error_fix,
    tasks                = EXCLUDED.tasks,
    commits              = EXCLUDED.commits,
    idle                 = EXCLUDED.idle,
    created_at           = NOW();

END;
$$;

-- ============================================================
-- Daily Metrics Aggregation Function (All Users, Single Day)
-- ============================================================
-- Aggregate for all users on a specific day
CREATE OR REPLACE FUNCTION make_daily_metrics_all(p_day DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM sessions_edits
      UNION SELECT user_id FROM save_edit_sessions
      UNION SELECT user_id FROM file_switch_windows
      UNION SELECT user_id FROM diagnostic_density_sessions
      UNION SELECT user_id FROM error_fix_sessions
      UNION SELECT user_id FROM task_runs
      UNION SELECT user_id FROM commit_edit_sessions
      UNION SELECT user_id FROM idle_sessions
      UNION SELECT user_id FROM focus_streaks
    ) u
  LOOP
    PERFORM make_daily_metrics(r.user_id, p_day);
  END LOOP;
END;
$$;

-- ============================================================
-- 11) Productivity Score (AI-Generated Daily Assessment)
-- ============================================================
CREATE TABLE IF NOT EXISTS productivity_score (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recommendations JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_productivity_score_user ON productivity_score(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_productivity_score_score ON productivity_score(user_id, score DESC);
-- 10) Error Sessions (Code Risk - Data sent to Gemini)
-- ============================================================
CREATE TABLE IF NOT EXISTS error_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  
  -- File identification
  file_uri TEXT NOT NULL,
  file_hash TEXT,
  language TEXT,
  
  -- Metrics
  loc INT NOT NULL CHECK (loc >= 0),
  error_count_session INT NOT NULL CHECK (error_count_session > 0),
  insertions_15m INT NOT NULL DEFAULT 0,
  deletions_15m INT NOT NULL DEFAULT 0,
  
  -- Error details
  all_error_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Timing
  session_start_time TIMESTAMPTZ NOT NULL,
  session_end_time TIMESTAMPTZ NOT NULL,
  
  -- Status
  sent_to_gemini BOOLEAN DEFAULT FALSE,
  gemini_requested_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error session queries
CREATE INDEX IF NOT EXISTS idx_error_sessions_user ON error_sessions(user_id, session_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_error_sessions_file ON error_sessions(file_uri, session_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_error_sessions_pending ON error_sessions(sent_to_gemini, created_at) WHERE sent_to_gemini = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_sessions_session_id ON error_sessions(session_id);

-- ============================================================
-- 11) Gemini Risk Results (AI Analysis Results for Display)
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_risk_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id TEXT NOT NULL,
  error_session_id UUID NOT NULL REFERENCES error_sessions(id) ON DELETE CASCADE,
  
  user_id TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  
  -- Risk assessment
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  color_code TEXT NOT NULL CHECK (color_code IN ('Green', 'Yellow', 'Red')),
  
  -- Explanations
  risk_explanation TEXT NOT NULL,
  error_explanation TEXT NOT NULL,
  fix_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gemini risk results queries
CREATE INDEX IF NOT EXISTS idx_gemini_risk_results_user ON gemini_risk_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_risk_results_file ON gemini_risk_results(file_uri, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_risk_results_active ON gemini_risk_results(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_gemini_risk_results_session ON gemini_risk_results(session_id);
CREATE INDEX IF NOT EXISTS idx_gemini_risk_results_error_session ON gemini_risk_results(error_session_id);


-- =====================================================
-- MANUAL AGGREGATION (Call from backend API)
-- =====================================================

-- Function to aggregate ALL users' daily summaries for a specific day
-- This updates ONLY the 4 daily summary tables (NOT daily_metrics)
-- Call this from your backend API or manually
CREATE OR REPLACE FUNCTION aggregate_all_daily_summaries(p_date DATE DEFAULT NULL)
RETURNS TABLE(users_processed INT, target_date DATE) 
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  process_date DATE;
  user_count INT := 0;
BEGIN
  -- Default to previous day if no date provided
  process_date := COALESCE(p_date, CURRENT_DATE - INTERVAL '1 day');
  
  -- Get all unique users from detailed tracking tables
  FOR r IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM focus_streaks
        WHERE start_ts >= process_date::TIMESTAMPTZ 
        AND start_ts < (process_date + INTERVAL '1 day')::TIMESTAMPTZ
      UNION 
      SELECT user_id FROM idle_sessions
        WHERE start_ts >= process_date::TIMESTAMPTZ 
        AND start_ts < (process_date + INTERVAL '1 day')::TIMESTAMPTZ
      UNION 
      SELECT user_id FROM error_fix_sessions
        WHERE end_ts >= process_date::TIMESTAMPTZ 
        AND end_ts < (process_date + INTERVAL '1 day')::TIMESTAMPTZ
    ) u
  LOOP
    -- Update all 4 daily summary tables for this user
    PERFORM update_all_daily_summaries(r.user_id, process_date);
    user_count := user_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT user_count, process_date;
END;
$$;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================
-- Your backend can call these functions via API endpoints:
--
-- Aggregate yesterday's data for all users:
--   SELECT * FROM aggregate_all_daily_summaries();
--
-- Aggregate specific date:
--   SELECT * FROM aggregate_all_daily_summaries('2026-01-07');
--
-- Aggregate specific user and date:
--   SELECT update_all_daily_summaries('testUser', '2026-01-07');
