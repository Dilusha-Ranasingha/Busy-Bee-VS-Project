-- =====================================================
-- Busy Bee - Database Initialization
-- This file runs automatically when Docker starts
-- =====================================================


-- =====================================================
-- SAMPLE FEATURE (KEEP AS IS)
-- Products table (initial project setup)
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

-- Index for faster sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at DESC);


-- =====================================================
-- MEMBER 01 OUTPUT (ASSUMED TABLE)
-- Daily Focus Summary (Analytics → Forecasting input)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_focus_summary (
    user_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,

    -- KPI used for forecasting
    total_focus_minutes INTEGER NOT NULL,

    -- Extra analytics outputs (future use)
    max_focus_streak_min INTEGER,
    avg_focus_streak_min INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_daily_focus_summary
        PRIMARY KEY (user_id, date)
);


-- =====================================================
-- FORECASTING MODULE OUTPUT
-- ML Predictions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS forecast_daily_productivity (
    id SERIAL PRIMARY KEY,

    user_id VARCHAR(100) NOT NULL,
    target_date DATE NOT NULL,

    -- Forecasted KPI
    predicted_focus_minutes INTEGER NOT NULL,

    -- Confidence interval
    lower_bound INTEGER,
    upper_bound INTEGER,

    -- Metadata
    model_version VARCHAR(50),
    horizon_days INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- TEMP TEST DATA (SAFE TO REMOVE LATER)
-- =====================================================

INSERT INTO daily_focus_summary (
    user_id,
    date,
    total_focus_minutes,
    max_focus_streak_min,
    avg_focus_streak_min
) VALUES
('testUser', '2025-12-20', 90, 30, 15),
('testUser', '2025-12-21', 120, 40, 18),
('testUser', '2025-12-22', 110, 35, 16),
('testUser', '2025-12-23', 80, 25, 14),
('testUser', '2025-12-24', 100, 32, 17),
('testUser', '2025-12-25', 60, 22, 12),
('testUser', '2025-12-26', 70, 24, 13);
