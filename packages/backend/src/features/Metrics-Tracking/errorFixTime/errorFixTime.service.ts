import { getPool } from '../../../config/db';
import type {
  CreateErrorFixSessionInput,
  ErrorFixSession,
  ErrorFixStats,
} from './errorFixTime.types';

export const errorFixTimeService = {
  async createSession(input: CreateErrorFixSessionInput): Promise<ErrorFixSession> {
    const pool = getPool();
    const query = `
      INSERT INTO error_fix_sessions (
        user_id, workspace_id, file_hash, language,
        error_key, severity, start_ts, end_ts, duration_sec
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.workspaceId || null,
      input.fileHash,
      input.language || null,
      input.errorKey,
      input.severity,
      input.startTs,
      input.endTs,
      input.durationSec,
    ];

    const result = await pool.query(query, values);
    return mapRowToSession(result.rows[0]);
  },

  async getStats(userId: string, severity?: 'error' | 'warning'): Promise<ErrorFixStats> {
    const pool = getPool();
    
    const whereClause = severity
      ? `WHERE user_id = $1 AND severity = $2`
      : `WHERE user_id = $1`;
    const params = severity ? [userId, severity] : [userId];

    // Get longest fix time
    const longestQuery = `
      SELECT * FROM error_fix_sessions
      ${whereClause}
      ORDER BY duration_sec DESC, start_ts DESC
      LIMIT 1
    `;
    const longestResult = await pool.query(longestQuery, params);

    // Get shortest fix time
    const shortestQuery = `
      SELECT * FROM error_fix_sessions
      ${whereClause}
      ORDER BY duration_sec ASC, start_ts DESC
      LIMIT 1
    `;
    const shortestResult = await pool.query(shortestQuery, params);

    // Get average and total count
    const statsQuery = `
      SELECT AVG(duration_sec)::numeric as average, COUNT(*) as total
      FROM error_fix_sessions
      ${whereClause}
    `;
    const statsResult = await pool.query(statsQuery, params);
    const { average, total } = statsResult.rows[0];

    return {
      longest: longestResult.rows[0] ? mapRowToSession(longestResult.rows[0]) : null,
      shortest: shortestResult.rows[0] ? mapRowToSession(shortestResult.rows[0]) : null,
      average: average ? parseFloat(average) : null,
      total: parseInt(total),
    };
  },
};

function mapRowToSession(row: any): ErrorFixSession {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    fileHash: row.file_hash,
    language: row.language,
    errorKey: row.error_key,
    severity: row.severity,
    startTs: row.start_ts,
    endTs: row.end_ts,
    durationSec: parseInt(row.duration_sec),
    createdAt: row.created_at,
  };
}