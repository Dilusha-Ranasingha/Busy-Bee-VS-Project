import { getPool } from '../../../config/db';
import { CreateIdleSessionInput, IdleSession, IdleStats } from './idleSessions.types';

export const createSession = async (input: CreateIdleSessionInput): Promise<IdleSession> => {
  const pool = getPool();
  
  const result = await pool.query<IdleSession>(
    `INSERT INTO idle_sessions (
      session_id, user_id, workspace_id,
      start_ts, end_ts, duration_min,
      threshold_min, ended_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      input.sessionId,
      input.userId,
      input.workspaceId || null,
      input.startTs,
      input.endTs,
      input.durationMin,
      input.thresholdMin,
      input.endedReason || null,
    ]
  );
  
  return result.rows[0];
};

export const getStats = async (userId: string): Promise<IdleStats> => {
  const pool = getPool();
  
  // Get longest and shortest idle sessions
  const [longestResult, shortestResult] = await Promise.all([
    pool.query<IdleSession>(
      `SELECT * FROM idle_sessions
       WHERE user_id = $1
       ORDER BY duration_min DESC
       LIMIT 1`,
      [userId]
    ),
    pool.query<IdleSession>(
      `SELECT * FROM idle_sessions
       WHERE user_id = $1 AND duration_min >= 15
       ORDER BY duration_min ASC
       LIMIT 1`,
      [userId]
    ),
  ]);
  
  return {
    longest: longestResult.rows[0] || null,
    shortest: shortestResult.rows[0] || null,
  };
};
