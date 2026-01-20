-- Generate realistic synthetic data for test_user_high_performer
-- This script creates 90 days of realistic productivity data with patterns and variation

DO $$
DECLARE
  v_user_id TEXT := 'test_user_high_performer';
  v_day DATE;
  v_day_of_week INT;
  v_hour INT;
  v_focus_multiplier NUMERIC;
  v_productivity_level NUMERIC;
  v_session_count INT;
  i INT;
BEGIN
  -- Clear existing data for this test user
  DELETE FROM focus_streaks WHERE user_id = v_user_id;
  DELETE FROM file_switch_windows WHERE user_id = v_user_id;
  DELETE FROM sessions_edits WHERE user_id = v_user_id;
  DELETE FROM save_edit_sessions WHERE user_id = v_user_id;
  DELETE FROM diagnostic_density_sessions WHERE user_id = v_user_id;
  DELETE FROM error_fix_sessions WHERE user_id = v_user_id;
  DELETE FROM task_runs WHERE user_id = v_user_id;
  DELETE FROM commit_edit_sessions WHERE user_id = v_user_id;
  DELETE FROM idle_sessions WHERE user_id = v_user_id;
  DELETE FROM daily_metrics WHERE user_id = v_user_id;

  RAISE NOTICE 'Generating 90 days of synthetic data for %', v_user_id;

  -- Generate data for last 90 days
  FOR v_day IN 
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '90 days',
      CURRENT_DATE - INTERVAL '1 day',
      '1 day'::interval
    )::date
  LOOP
    v_day_of_week := EXTRACT(DOW FROM v_day); -- 0=Sunday, 6=Saturday
    
    -- Skip some weekends (simulate work-life balance)
    IF v_day_of_week IN (0, 6) AND random() < 0.7 THEN
      CONTINUE;
    END IF;

    -- Productivity varies: higher on Mon-Wed, lower on Fri
    v_productivity_level := CASE 
      WHEN v_day_of_week IN (1, 2, 3) THEN 0.8 + random() * 0.2  -- 0.8-1.0
      WHEN v_day_of_week = 4 THEN 0.6 + random() * 0.3           -- 0.6-0.9
      WHEN v_day_of_week = 5 THEN 0.5 + random() * 0.3           -- 0.5-0.8
      ELSE 0.4 + random() * 0.4                                   -- 0.4-0.8 (weekend work)
    END;

    -- Generate focus streaks (2-5 sessions per day)
    v_session_count := 2 + floor(random() * 4)::int;
    FOR i IN 1..v_session_count LOOP
      -- Morning sessions (9-12) have better focus
      v_hour := 9 + floor(random() * 9)::int; -- 9am-6pm
      v_focus_multiplier := CASE 
        WHEN v_hour BETWEEN 9 AND 11 THEN 1.3
        WHEN v_hour BETWEEN 14 AND 16 THEN 1.1
        ELSE 0.8
      END;

      INSERT INTO focus_streaks (user_id, session_id, start_ts, end_ts, duration_min, type)
      VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval + (random() * 60 || ' minutes')::interval,
        v_day + (v_hour || ' hours')::interval + ((30 + random() * 90) || ' minutes')::interval,
        (25 + random() * 60) * v_focus_multiplier * v_productivity_level, -- 25-85 min with multipliers
        CASE WHEN random() < 0.7 THEN 'global' ELSE 'per_file' END
      );
    END LOOP;

    -- Generate file switch windows (3-6 per day)
    FOR i IN 1..(3 + floor(random() * 4)::int) LOOP
      v_hour := 9 + floor(random() * 9)::int;
      INSERT INTO file_switch_windows (user_id, session_id, window_start, window_end, activation_count, rate_per_min)
      VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + '30 minutes'::interval,
        5 + floor(random() * 20)::int,
        0.3 + random() * 0.8 -- 0.3-1.1 switches/min
      );
    END LOOP;

    -- Generate edit sessions (4-8 per day)
    FOR i IN 1..(4 + floor(random() * 5)::int) LOOP
      v_hour := 9 + floor(random() * 9)::int;
      INSERT INTO sessions_edits (
        user_id, session_id, start_ts, end_ts, duration_min,
        edits_per_min, typing_burstiness_index, paste_events
      ) VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + ((20 + random() * 40) || ' minutes')::interval,
        20 + random() * 40,
        10 + random() * 15 * v_productivity_level, -- 10-25 edits/min
        0.4 + random() * 0.4, -- 0.4-0.8 burstiness
        floor(random() * 5)::int
      );
    END LOOP;

    -- Generate save/edit sessions (4-6 per day)
    FOR i IN 1..(4 + floor(random() * 3)::int) LOOP
      v_hour := 9 + floor(random() * 9)::int;
      INSERT INTO save_edit_sessions (
        user_id, session_id, start_ts, end_ts, duration_min,
        save_to_edit_ratio_manual, effective_save_to_edit_ratio,
        median_secs_between_saves, checkpoint_autosave_count
      ) VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + '25 minutes'::interval,
        25,
        0.05 + random() * 0.15, -- 0.05-0.2
        0.15 + random() * 0.25, -- 0.15-0.4
        180 + random() * 300, -- 3-8 min between saves
        2 + floor(random() * 8)::int -- 2-10 autosaves
      );
    END LOOP;

    -- Generate diagnostic density sessions (2-4 per day)
    FOR i IN 1..(2 + floor(random() * 3)::int) LOOP
      v_hour := 9 + floor(random() * 9)::int;
      INSERT INTO diagnostic_density_sessions (
        user_id, session_id, start_ts, end_ts, duration_min, peak_density_per_kloc
      ) VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + '20 minutes'::interval,
        20,
        0.5 + random() * 2.5 / v_productivity_level -- 0.5-3.0 issues/kloc, more when less productive
      );
    END LOOP;

    -- Generate error fix sessions (2-6 per day)
    FOR i IN 1..(2 + floor(random() * 5)::int) LOOP
      v_hour := 9 + floor(random() * 9)::int;
      INSERT INTO error_fix_sessions (
        user_id, session_id, start_ts, end_ts, duration_sec
      ) VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + ((2 + random() * 10) || ' minutes')::interval,
        120 + random() * 600 -- 2-12 minutes
      );
    END LOOP;

    -- Generate task runs (1-4 per day)
    FOR i IN 1..(1 + floor(random() * 4)::int) LOOP
      v_hour := 10 + floor(random() * 7)::int;
      INSERT INTO task_runs (
        user_id, session_id, start_ts, end_ts, duration_sec,
        kind, result
      ) VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + ((15 + random() * 45) || ' seconds')::interval,
        15 + random() * 45,
        CASE WHEN random() < 0.7 THEN 'test' ELSE 'build' END,
        CASE WHEN random() < 0.85 * v_productivity_level THEN 'pass' ELSE 'fail' END
      );
    END LOOP;

    -- Generate commits (0-3 per day, realistic cadence)
    IF random() < 0.8 THEN -- Not every day has commits
      FOR i IN 1..(1 + floor(random() * 3)::int) LOOP
        v_hour := 11 + floor(random() * 6)::int;
        INSERT INTO commit_edit_sessions (
          user_id, session_id, start_ts, end_ts, duration_min,
          edits_per_commit, aborted
        ) VALUES (
          v_user_id,
          gen_random_uuid()::text,
          v_day + (v_hour || ' hours')::interval,
          v_day + (v_hour || ' hours')::interval + ((30 + random() * 60) || ' minutes')::interval,
          30 + random() * 60,
          50 + random() * 150, -- 50-200 edits per commit
          random() < 0.05 -- 5% aborted
        );
      END LOOP;
    END IF;

    -- Generate idle sessions (1-3 per day)
    FOR i IN 1..(1 + floor(random() * 3)::int) LOOP
      v_hour := 9 + floor(random() * 9)::int;
      INSERT INTO idle_sessions (
        user_id, session_id, start_ts, end_ts, duration_min
      ) VALUES (
        v_user_id,
        gen_random_uuid()::text,
        v_day + (v_hour || ' hours')::interval,
        v_day + (v_hour || ' hours')::interval + ((5 + random() * 25) || ' minutes')::interval,
        5 + random() * 25 / v_productivity_level -- 5-30 min idle, more when less productive
      );
    END LOOP;

    -- Aggregate into daily_metrics
    PERFORM aggregate_daily_metrics(v_user_id, v_day);
    
    -- Mark as synthetic
    UPDATE daily_metrics 
    SET is_synthetic = TRUE 
    WHERE user_id = v_user_id AND date = v_day;

    IF EXTRACT(DAY FROM v_day) % 10 = 0 THEN
      RAISE NOTICE 'Generated data up to %', v_day;
    END IF;
  END LOOP;

  RAISE NOTICE 'Synthetic data generation complete!';
  RAISE NOTICE 'Generated data for % days', (SELECT COUNT(*) FROM daily_metrics WHERE user_id = v_user_id);
END $$;

-- Verify data generation
SELECT 
  COUNT(*) as total_days,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  AVG((focus_streak->>'global_focus_streak_max_min')::numeric) as avg_focus_streak,
  AVG((file_switch->>'file_switch_rate_avg')::numeric) as avg_file_switch,
  AVG((commits->>'commits_total')::numeric) as avg_commits,
  AVG((idle->>'idle_time_min_total')::numeric) as avg_idle_time
FROM daily_metrics 
WHERE user_id = 'test_user_high_performer'
  AND is_synthetic = TRUE;
