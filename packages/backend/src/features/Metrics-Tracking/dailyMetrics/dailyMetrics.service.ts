import { getPool } from '../../../config/db';
import { DailyMetricsRecord } from './dailyMetrics.types';

export const getDailyMetrics = async (userId: string, date: string): Promise<DailyMetricsRecord | null> => {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT 
      user_id as "userId",
      date,
      file_switch as "fileSwitch",
      focus_streak as "focusStreak",
      edits_per_min as "editsPerMin",
      saves_to_edit_ratio as "savesToEditRatio",
      diagnostics_per_kloc as "diagnosticsPerKloc",
      error_fix as "errorFix",
      tasks,
      commits,
      idle,
      created_at as "createdAt"
     FROM daily_metrics
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  
  return result.rows[0] || null;
};

export const getDailyMetricsRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyMetricsRecord[]> => {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT 
      user_id as "userId",
      date,
      file_switch as "fileSwitch",
      focus_streak as "focusStreak",
      edits_per_min as "editsPerMin",
      saves_to_edit_ratio as "savesToEditRatio",
      diagnostics_per_kloc as "diagnosticsPerKloc",
      error_fix as "errorFix",
      tasks,
      commits,
      idle,
      created_at as "createdAt"
     FROM daily_metrics
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date DESC`,
    [userId, startDate, endDate]
  );
  
  return result.rows;
};

export const triggerDailyAggregation = async (date: string): Promise<void> => {
  const pool = getPool();
  
  await pool.query('SELECT make_daily_metrics_all($1)', [date]);
};

export const triggerUserDailyAggregation = async (userId: string, date: string): Promise<void> => {
  const pool = getPool();
  
  await pool.query('SELECT make_daily_metrics($1, $2)', [userId, date]);
};
