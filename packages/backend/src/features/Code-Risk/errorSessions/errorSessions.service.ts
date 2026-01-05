import { getPool } from '../../../config/db';
import { 
  CreateErrorSessionPayload, 
  ErrorSessionDTO 
} from './errorSessions.types';

export class ErrorSessionsService {
  /**
   * Create a new error session
   */
  static async createSession(payload: CreateErrorSessionPayload): Promise<ErrorSessionDTO> {
    const pool = getPool();
    const query = `
      INSERT INTO error_sessions (
        session_id, user_id, workspace_id, file_uri, file_hash, language,
        loc, error_count_session, insertions_15m, deletions_15m,
        all_error_messages, session_start_time, session_end_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      payload.session_id,
      payload.user_id,
      payload.workspace_id || null,
      payload.file_uri,
      payload.file_hash || null,
      payload.language || null,
      payload.loc,
      payload.error_count_session,
      payload.insertions_15m,
      payload.deletions_15m,
      JSON.stringify(payload.all_error_messages),
      payload.session_start_time,
      payload.session_end_time
    ];

    const result = await pool.query(query, values);
    return this.mapToDTO(result.rows[0]);
  }

  /**
   * Get all error sessions for a user
   */
  static async getSessionsByUser(userId: string, limit = 100): Promise<ErrorSessionDTO[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM error_sessions
      WHERE user_id = $1
      ORDER BY session_start_time DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows.map(this.mapToDTO);
  }

  /**
   * Get error sessions by file
   */
  static async getSessionsByFile(fileUri: string, limit = 50): Promise<ErrorSessionDTO[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM error_sessions
      WHERE file_uri = $1
      ORDER BY session_start_time DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [fileUri, limit]);
    return result.rows.map(this.mapToDTO);
  }

  /**
   * Get pending sessions (not yet sent to Gemini)
   */
  static async getPendingSessions(limit = 10): Promise<ErrorSessionDTO[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM error_sessions
      WHERE sent_to_gemini = FALSE
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map(this.mapToDTO);
  }

  /**
   * Get a session by ID
   */
  static async getSessionById(id: string): Promise<ErrorSessionDTO | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM error_sessions
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToDTO(result.rows[0]) : null;
  }

  /**
   * Mark session as sent to Gemini
   */
  static async markAsSentToGemini(id: string): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE error_sessions
      SET sent_to_gemini = TRUE, gemini_requested_at = NOW()
      WHERE id = $1
    `;

    await pool.query(query, [id]);
  }

  /**
   * Get recent sessions by user (last 24 hours)
   */
  static async getRecentSessions(userId: string): Promise<ErrorSessionDTO[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM error_sessions
      WHERE user_id = $1
        AND session_start_time >= NOW() - INTERVAL '24 hours'
      ORDER BY session_start_time DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.map(this.mapToDTO);
  }

  /**
   * Map database row to DTO
   */
  private static mapToDTO(row: any): ErrorSessionDTO {
    return {
      id: row.id,
      session_id: row.session_id,
      user_id: row.user_id,
      workspace_id: row.workspace_id,
      file_uri: row.file_uri,
      file_hash: row.file_hash,
      language: row.language,
      loc: parseInt(row.loc),
      error_count_session: parseInt(row.error_count_session),
      insertions_15m: parseInt(row.insertions_15m),
      deletions_15m: parseInt(row.deletions_15m),
      all_error_messages: row.all_error_messages || [],
      session_start_time: row.session_start_time.toISOString(),
      session_end_time: row.session_end_time.toISOString(),
      sent_to_gemini: row.sent_to_gemini,
      gemini_requested_at: row.gemini_requested_at ? row.gemini_requested_at.toISOString() : null,
      created_at: row.created_at.toISOString()
    };
  }
}
