-- Create products table
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
  session_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end   TIMESTAMPTZ NOT NULL,

  -- Your rule: count activations including returning to same file
  activation_count INT NOT NULL CHECK (activation_count >= 0),

  -- Convenience field: activation_count / windowMinutes
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
  saves_manual INT NOT NULL,
  saves_autosave_delay INT NOT NULL,
  saves_autosave_focusout INT NOT NULL,
  
  -- Processed save counts
  autosaves_effective INT NOT NULL,
  checkpoint_autosave_count INT NOT NULL,
  
  -- Ratios
  save_to_edit_ratio_manual NUMERIC NOT NULL,
  save_to_edit_ratio_autosave NUMERIC NOT NULL,
  effective_save_to_edit_ratio NUMERIC NOT NULL,
  
  -- Spacing metrics
  avg_secs_between_saves NUMERIC,
  median_secs_between_saves NUMERIC,
  
  -- Context
  manual_save_share NUMERIC,
  collapse_window_sec INT DEFAULT 60,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_save_edit_sessions_user_ratio ON save_edit_sessions(user_id, effective_save_to_edit_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_save_edit_sessions_start ON save_edit_sessions(start_ts DESC);
CREATE INDEX IF NOT EXISTS idx_save_edit_sessions_session ON save_edit_sessions(session_id);

