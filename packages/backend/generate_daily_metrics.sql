-- Quick synthetic data generation - insert directly into daily_metrics
-- This bypasses the tracking tables and creates realistic productivity patterns

DO $$
DECLARE
  v_user_id TEXT := 'test_user_high_performer';
  v_day DATE;
  v_day_of_week INT;
  v_productivity_level NUMERIC;
  v_focus_base NUMERIC;
  v_commits NUMERIC;
BEGIN
  -- Clear existing daily_metrics for this user
  DELETE FROM daily_metrics WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Generating 90 days of synthetic daily_metrics for %', v_user_id;

  -- Generate data for last 90 days
  FOR v_day IN 
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '90 days',
      CURRENT_DATE - INTERVAL '1 day',
      '1 day'::interval
    )::date
  LOOP
    v_day_of_week := EXTRACT(DOW FROM v_day); -- 0=Sunday, 6=Saturday
    
    -- Skip most weekends
    IF v_day_of_week IN (0, 6) AND random() < 0.75 THEN
      CONTINUE;
    END IF;

    -- Productivity varies by day of week
    v_productivity_level := CASE 
      WHEN v_day_of_week IN (1, 2, 3) THEN 0.85 + random() * 0.15  -- Mon-Wed: 0.85-1.0
      WHEN v_day_of_week = 4 THEN 0.70 + random() * 0.20            -- Thu: 0.70-0.90
      WHEN v_day_of_week = 5 THEN 0.55 + random() * 0.25            -- Fri: 0.55-0.80
      ELSE 0.40 + random() * 0.30                                    -- Weekend: 0.40-0.70
    END;

    -- Base focus streak with variation
    v_focus_base := 35 + random() * 30; -- 35-65 min base
    
    -- Commits vary
    v_commits := CASE 
      WHEN random() < 0.3 THEN 0  -- 30% of days have no commits
      ELSE random() * 3            -- 0-3 commits
    END;

    INSERT INTO daily_metrics (
      user_id, date, is_synthetic,
      file_switch, focus_streak, edits_per_min, saves_to_edit_ratio,
      diagnostics_per_kloc, error_fix, tasks, commits, idle
    ) VALUES (
      v_user_id,
      v_day,
      TRUE,
      
      -- file_switch
      JSONB_BUILD_OBJECT(
        'file_switch_rate_avg', (0.4 + random() * 0.6) * v_productivity_level,  -- 0.4-1.0/min
        'file_switch_rate_p95', (0.8 + random() * 0.8) * v_productivity_level,  -- 0.8-1.6/min
        'file_switch_count_total', (15 + floor(random() * 40))::int,           -- 15-55 switches
        'file_switch_sessions', (3 + floor(random() * 5))::int                  -- 3-8 sessions
      ),

      -- focus_streak
      JSONB_BUILD_OBJECT(
        'global_focus_streak_max_min', v_focus_base * v_productivity_level,     -- 30-65 min
        'per_file_focus_streak_max_min', (v_focus_base * 0.7) * v_productivity_level  -- ~70% of global
      ),

      -- edits_per_min
      JSONB_BUILD_OBJECT(
        'edits_per_min_avg', (12 + random() * 10) * v_productivity_level,       -- 12-22 edits/min
        'edits_per_min_p95', (18 + random() * 12) * v_productivity_level,       -- 18-30 edits/min
        'typing_burstiness_index_avg', 0.45 + random() * 0.35,                  -- 0.45-0.80
        'paste_events_total', floor(random() * 12)::int,                        -- 0-12 pastes
        'active_time_min_from_edits', (180 + random() * 180) * v_productivity_level  -- 3-6 hours
      ),

      -- saves_to_edit_ratio
      JSONB_BUILD_OBJECT(
        'save_to_edit_ratio_manual_avg', 0.08 + random() * 0.12,                -- 0.08-0.20
        'effective_save_to_edit_ratio_avg', 0.20 + random() * 0.20,             -- 0.20-0.40
        'median_secs_between_saves', 200 + random() * 300,                      -- 3.3-8.3 min
        'checkpoint_autosave_count_total', (4 + floor(random() * 10))::int      -- 4-14 autosaves
      ),

      -- diagnostics_per_kloc
      JSONB_BUILD_OBJECT(
        'diagnostics_density_avg_per_kloc', (1.0 + random() * 2.0) / v_productivity_level,  -- 1.0-3.0 issues/kloc
        'diagnostics_hotspot_max_per_kloc', (2.0 + random() * 4.0) / v_productivity_level   -- 2.0-6.0 max
      ),

      -- error_fix
      JSONB_BUILD_OBJECT(
        'fixes_count', (2 + floor(random() * 6))::int,                          -- 2-8 fixes
        'median_active_fix_time_min', 3 + random() * 7,                         -- 3-10 min
        'min_active_fix_time_min', 1 + random() * 3                             -- 1-4 min
      ),

      -- tasks
      JSONB_BUILD_OBJECT(
        'test_runs', (1 + floor(random() * 5))::int,                            -- 1-6 test runs
        'build_runs', (0 + floor(random() * 3))::int,                           -- 0-3 build runs
        'overall_pass_rate', 0.75 + random() * 0.20 * v_productivity_level,     -- 0.75-0.95
        'avg_test_duration_sec', 20 + random() * 40                             -- 20-60 seconds
      ),

      -- commits
      JSONB_BUILD_OBJECT(
        'commits_total', v_commits,
        'median_mins_between_commits', CASE WHEN v_commits > 0 THEN 40 + random() * 80 ELSE 0 END,  -- 40-120 min
        'best_commits_in_any_hour', CASE WHEN v_commits > 2 THEN 2 ELSE floor(v_commits)::int END,  -- Max 2/hour
        'avg_edits_per_commit', CASE WHEN v_commits > 0 THEN 60 + random() * 120 ELSE 0 END        -- 60-180 edits/commit
      ),

      -- idle
      JSONB_BUILD_OBJECT(
        'idle_time_min_total', (15 + random() * 35) / v_productivity_level,    -- 15-50 min idle (more when less productive)
        'idle_sessions_count', (1 + floor(random() * 4))::int                   -- 1-5 idle sessions
      )
    );

    IF EXTRACT(DAY FROM v_day) % 15 = 0 THEN
      RAISE NOTICE 'Generated data up to %', v_day;
    END IF;
  END LOOP;

  RAISE NOTICE 'Synthetic data generation complete!';
END $$;

-- Verify data generation
SELECT 
  COUNT(*) as total_days,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  ROUND(AVG((focus_streak->>'global_focus_streak_max_min')::numeric), 2) as avg_focus_min,
  ROUND(AVG((file_switch->>'file_switch_rate_avg')::numeric), 2) as avg_file_switch_rate,
  ROUND(AVG((edits_per_min->>'edits_per_min_avg')::numeric), 2) as avg_edits_per_min,
  ROUND(AVG((commits->>'commits_total')::numeric), 2) as avg_commits_per_day,
  ROUND(AVG((idle->>'idle_time_min_total')::numeric), 2) as avg_idle_min,
  ROUND(AVG((error_fix->>'fixes_count')::numeric), 2) as avg_error_fixes
FROM daily_metrics 
WHERE user_id = 'test_user_high_performer'
  AND is_synthetic = TRUE;

SELECT 'Data generated successfully! You can now retrain the model.' AS status;
