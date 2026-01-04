import { getPool } from '../../../config/db';
import { CreateEditSessionInput, EditSession, GetBestSessionsParams } from './editSessions.types';

class EditSessionsService {
  async createEditSession(input: CreateEditSessionInput): Promise<EditSession> {
    if (!input.userId) {
      throw new Error('userId is required');
    }

    const pool = getPool();

    const query = `
      INSERT INTO sessions_edits (
        user_id, session_id, workspace_id,
        start_ts, end_ts, duration_min,
        edits_per_min, insert_chars_per_min, delete_chars_per_min, add_delete_ratio,
        total_edits, total_insert_chars, total_delete_chars,
        typing_burstiness_index, burst_count, avg_burst_len_sec, longest_pause_min, paste_events
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.sessionId,
      input.workspaceId || null,
      input.startTs,
      input.endTs,
      input.durationMin,
      input.editsPerMin,
      input.insertCharsPerMin,
      input.deleteCharsPerMin,
      input.addDeleteRatio,
      input.totalEdits,
      input.totalInsertChars,
      input.totalDeleteChars,
      input.typingBurstinessIndex || null,
      input.burstCount || null,
      input.avgBurstLenSec || null,
      input.longestPauseMin || null,
      input.pasteEvents || null,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToEditSession(result.rows[0]);
  }

  async getBestSessions(params: GetBestSessionsParams): Promise<EditSession[]> {
    if (!params.userId) {
      throw new Error('userId is required');
    }

    const pool = getPool();

    let query = `
      SELECT * FROM sessions_edits
      WHERE user_id = $1
    `;

    const values: any[] = [params.userId];
    let paramIndex = 2;

    if (params.startDate) {
      query += ` AND start_ts >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND end_ts <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += ` ORDER BY edits_per_min DESC`;

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
    }

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToEditSession(row));
  }

  async getBestSession(userId: string): Promise<EditSession | null> {
    const sessions = await this.getBestSessions({
      userId,
      limit: 1,
    });

    return sessions.length > 0 ? sessions[0] : null;
  }

  async getTop3Sessions(userId: string): Promise<EditSession[]> {
    return this.getBestSessions({
      userId,
      limit: 3,
    });
  }

  private mapRowToEditSession(row: any): EditSession {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      workspaceId: row.workspace_id,
      startTs: new Date(row.start_ts),
      endTs: new Date(row.end_ts),
      durationMin: parseFloat(row.duration_min),
      editsPerMin: parseFloat(row.edits_per_min),
      insertCharsPerMin: parseFloat(row.insert_chars_per_min),
      deleteCharsPerMin: parseFloat(row.delete_chars_per_min),
      addDeleteRatio: parseFloat(row.add_delete_ratio),
      totalEdits: parseInt(row.total_edits),
      totalInsertChars: parseInt(row.total_insert_chars),
      totalDeleteChars: parseInt(row.total_delete_chars),
      typingBurstinessIndex: row.typing_burstiness_index ? parseFloat(row.typing_burstiness_index) : undefined,
      burstCount: row.burst_count ? parseInt(row.burst_count) : undefined,
      avgBurstLenSec: row.avg_burst_len_sec ? parseFloat(row.avg_burst_len_sec) : undefined,
      longestPauseMin: row.longest_pause_min ? parseFloat(row.longest_pause_min) : undefined,
      pasteEvents: row.paste_events ? parseInt(row.paste_events) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

export default new EditSessionsService();
