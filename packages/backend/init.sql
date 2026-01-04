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
-- Your ML Predictions table (optional to use later)
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


-- =====================================================
-- KPI PLACEHOLDER TABLE #1 (Member 01 -> Idle sessions)
-- Daily Idle Summary (direct session-based)
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
-- KPI PLACEHOLDER TABLE #2 (Member 01 -> Error fix sessions)
-- Daily Error Summary
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
-- SEED DATA (30 days) - testUser
-- This gives enough history for XGBoost lags/rolling features
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
      WHEN EXTRACT(DOW FROM d) IN (0,6) THEN 85  -- weekend lower
      ELSE 120 + (EXTRACT(DOW FROM d)::int * 4)  -- weekday pattern
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


-- Idle seed: correlated (higher idle on weekend, moderate weekdays)
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


-- Error seed: more errors on some weekdays, less on weekends
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
