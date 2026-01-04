import { getPool } from '../../../config/db';
import type {
  CreateDiagnosticDensitySessionInput,
  DiagnosticDensitySession,
  DiagnosticDensityBestSessions,
} from './diagnosticDensity.types';

export const diagnosticDensityService = {
  async createSession(input: CreateDiagnosticDensitySessionInput): Promise<DiagnosticDensitySession> {
    const pool = getPool();
    const query = `
      INSERT INTO diagnostic_density_sessions (
        user_id, session_id, workspace_id, file_hash, language,
        start_ts, end_ts, duration_min,
        peak_line_count, peak_errors, peak_warnings, peak_density_per_kloc,
        final_line_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.sessionId,
      input.workspaceId || null,
      input.fileHash,
      input.language || null,
      input.startTs,
      input.endTs,
      input.durationMin,
      input.peakLineCount,
      input.peakErrors,
      input.peakWarnings,
      input.peakDensityPerKloc,
      input.finalLineCount,
    ];

    const result = await pool.query(query, values);
    return mapRowToSession(result.rows[0]);
  },

  async getBestSessions(userId: string): Promise<DiagnosticDensityBestSessions> {
    const pool = getPool();
    
    // Get highest peak density (worst session)
    const highestQuery = `
      SELECT * FROM diagnostic_density_sessions
      WHERE user_id = $1
      ORDER BY peak_density_per_kloc DESC, start_ts DESC
      LIMIT 1
    `;
    const highestResult = await pool.query(highestQuery, [userId]);

    // Get lowest peak density (best session - least problems)
    const lowestQuery = `
      SELECT * FROM diagnostic_density_sessions
      WHERE user_id = $1
      ORDER BY peak_density_per_kloc ASC, start_ts DESC
      LIMIT 1
    `;
    const lowestResult = await pool.query(lowestQuery, [userId]);

    return {
      highest: highestResult.rows[0] ? mapRowToSession(highestResult.rows[0]) : null,
      lowest: lowestResult.rows[0] ? mapRowToSession(lowestResult.rows[0]) : null,
    };
  },
};

function mapRowToSession(row: any): DiagnosticDensitySession {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    fileHash: row.file_hash,
    language: row.language,
    startTs: row.start_ts,
    endTs: row.end_ts,
    durationMin: parseFloat(row.duration_min),
    peakLineCount: parseInt(row.peak_line_count),
    peakErrors: parseInt(row.peak_errors),
    peakWarnings: parseInt(row.peak_warnings),
    peakDensityPerKloc: parseFloat(row.peak_density_per_kloc),
    finalLineCount: parseInt(row.final_line_count),
    createdAt: row.created_at,
  };
}
