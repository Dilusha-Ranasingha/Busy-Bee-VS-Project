import { getPool } from '../../../config/db';
import type {
  CreateDiagnosticDensityEventInput,
  DiagnosticDensityEvent,
  DiagnosticDensityExtremes,
} from './diagnosticDensity.types';

export const diagnosticDensityService = {
  async createEvent(input: CreateDiagnosticDensityEventInput): Promise<DiagnosticDensityEvent> {
    const pool = getPool();
    const query = `
      INSERT INTO diagnostic_density_events (
        user_id, workspace_id, file_hash, language, ts,
        line_count, errors, warnings, density_per_kloc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.workspaceId || null,
      input.fileHash,
      input.language || null,
      input.ts,
      input.lineCount,
      input.errors,
      input.warnings,
      input.densityPerKloc,
    ];

    const result = await pool.query(query, values);
    return mapRowToEvent(result.rows[0]);
  },

  async getExtremes(userId: string): Promise<DiagnosticDensityExtremes> {
    const pool = getPool();
    
    // Get highest density (worst)
    const highestQuery = `
      SELECT * FROM diagnostic_density_events
      WHERE user_id = $1
      ORDER BY density_per_kloc DESC, ts DESC
      LIMIT 1
    `;
    const highestResult = await pool.query(highestQuery, [userId]);

    // Get lowest non-zero density (best under pressure)
    const lowestQuery = `
      SELECT * FROM diagnostic_density_events
      WHERE user_id = $1 AND density_per_kloc > 0
      ORDER BY density_per_kloc ASC, ts DESC
      LIMIT 1
    `;
    const lowestResult = await pool.query(lowestQuery, [userId]);

    // Get latest zero density (cleaned)
    const zeroQuery = `
      SELECT * FROM diagnostic_density_events
      WHERE user_id = $1 AND density_per_kloc = 0
      ORDER BY ts DESC
      LIMIT 1
    `;
    const zeroResult = await pool.query(zeroQuery, [userId]);

    return {
      highest: highestResult.rows[0] ? mapRowToEvent(highestResult.rows[0]) : null,
      lowestNonZero: lowestResult.rows[0] ? mapRowToEvent(lowestResult.rows[0]) : null,
      latestZero: zeroResult.rows[0] ? mapRowToEvent(zeroResult.rows[0]) : null,
    };
  },
};

function mapRowToEvent(row: any): DiagnosticDensityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    fileHash: row.file_hash,
    language: row.language,
    ts: row.ts,
    lineCount: parseInt(row.line_count),
    errors: parseInt(row.errors),
    warnings: parseInt(row.warnings),
    densityPerKloc: parseFloat(row.density_per_kloc),
    createdAt: row.created_at,
  };
}
