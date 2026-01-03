import { getPool } from '../../../config/db';
import { CreateSaveEditSessionInput, SaveEditSession, GetBestSessionsParams } from './saveEditSessions.types';

class SaveEditSessionsService {
  async createSession(input: CreateSaveEditSessionInput): Promise<SaveEditSession> {
    if (!input.userId) {
      throw new Error('userId is required');
    }

    const pool = getPool();

    const query = `
      INSERT INTO save_edit_sessions (
        user_id, session_id, workspace_id,
        start_ts, end_ts, duration_min,
        edits_total,
        saves_manual, saves_autosave_delay, saves_autosave_focusout,
        autosaves_effective, checkpoint_autosave_count,
        save_to_edit_ratio_manual, save_to_edit_ratio_autosave, effective_save_to_edit_ratio,
        avg_secs_between_saves, median_secs_between_saves,
        manual_save_share, collapse_window_sec
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.sessionId,
      input.workspaceId || null,
      input.startTs,
      input.endTs,
      input.durationMin,
      input.editsTotal,
      input.savesManual,
      input.savesAutosaveDelay,
      input.savesAutosaveFocusout,
      input.autosavesEffective,
      input.checkpointAutosaveCount,
      input.saveToEditRatioManual,
      input.saveToEditRatioAutosave,
      input.effectiveSaveToEditRatio,
      input.avgSecsBetweenSaves || null,
      input.medianSecsBetweenSaves || null,
      input.manualSaveShare || null,
      input.collapseWindowSec || 60,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToSession(result.rows[0]);
  }

  async getBestSessions(params: GetBestSessionsParams): Promise<SaveEditSession[]> {
    if (!params.userId) {
      throw new Error('userId is required');
    }

    const pool = getPool();

    let query = `
      SELECT * FROM save_edit_sessions
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

    query += ` ORDER BY effective_save_to_edit_ratio DESC`;

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
    }

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToSession(row));
  }

  async getBestSession(userId: string): Promise<SaveEditSession | null> {
    const sessions = await this.getBestSessions({
      userId,
      limit: 1,
    });

    return sessions.length > 0 ? sessions[0] : null;
  }

  private mapRowToSession(row: any): SaveEditSession {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      workspaceId: row.workspace_id,
      startTs: new Date(row.start_ts),
      endTs: new Date(row.end_ts),
      durationMin: parseFloat(row.duration_min),
      editsTotal: parseInt(row.edits_total),
      savesManual: parseInt(row.saves_manual),
      savesAutosaveDelay: parseInt(row.saves_autosave_delay),
      savesAutosaveFocusout: parseInt(row.saves_autosave_focusout),
      autosavesEffective: parseInt(row.autosaves_effective),
      checkpointAutosaveCount: parseInt(row.checkpoint_autosave_count),
      saveToEditRatioManual: parseFloat(row.save_to_edit_ratio_manual),
      saveToEditRatioAutosave: parseFloat(row.save_to_edit_ratio_autosave),
      effectiveSaveToEditRatio: parseFloat(row.effective_save_to_edit_ratio),
      avgSecsBetweenSaves: row.avg_secs_between_saves ? parseFloat(row.avg_secs_between_saves) : undefined,
      medianSecsBetweenSaves: row.median_secs_between_saves ? parseFloat(row.median_secs_between_saves) : undefined,
      manualSaveShare: row.manual_save_share ? parseFloat(row.manual_save_share) : undefined,
      collapseWindowSec: parseInt(row.collapse_window_sec),
      createdAt: new Date(row.created_at),
    };
  }
}

export default new SaveEditSessionsService();
