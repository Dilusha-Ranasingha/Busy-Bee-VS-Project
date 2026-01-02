import { getPool } from '../../../config/db';
import { CreateFocusStreakInput, FocusStreak, GetBestStreaksParams } from './focusStreak.types';

class FocusStreakService {
  async createFocusStreak(input: CreateFocusStreakInput): Promise<FocusStreak> {
    if (!input.userId) {
      throw new Error('userId is required');
    }

    const pool = getPool();

    const query = `
      INSERT INTO focus_streaks (
        user_id, workspace_id, session_id, type,
        file_hash, language,
        start_ts, end_ts, duration_min
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.workspaceId || null,
      input.sessionId,
      input.type,
      input.fileHash || null,
      input.language || null,
      input.startTs,
      input.endTs,
      input.durationMin,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToFocusStreak(result.rows[0]);
  }

  async createMany(inputs: CreateFocusStreakInput[]): Promise<FocusStreak[]> {
    if (inputs.length === 0) return [];

    // Validate all have userId
    inputs.forEach(input => {
      if (!input.userId) {
        throw new Error('All streaks must have userId');
      }
    });

    const pool = getPool();

    // Build bulk insert query
    const placeholders = inputs.map((_, i) => {
      const offset = i * 9;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    }).join(', ');

    const query = `
      INSERT INTO focus_streaks (
        user_id, workspace_id, session_id, type,
        file_hash, language,
        start_ts, end_ts, duration_min
      ) VALUES ${placeholders}
      RETURNING *
    `;

    const values = inputs.flatMap(input => [
      input.userId,
      input.workspaceId || null,
      input.sessionId,
      input.type,
      input.fileHash || null,
      input.language || null,
      input.startTs,
      input.endTs,
      input.durationMin,
    ]);

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToFocusStreak(row));
  }

  async getBestStreaks(params: GetBestStreaksParams): Promise<FocusStreak[]> {
    if (!params.userId) {
      throw new Error('userId is required');
    }

    const pool = getPool();

    let query = `
      SELECT * FROM focus_streaks
      WHERE user_id = $1
    `;

    const values: any[] = [params.userId];
    let paramIndex = 2;

    if (params.type) {
      query += ` AND type = $${paramIndex}`;
      values.push(params.type);
      paramIndex++;
    }

    if (params.language) {
      query += ` AND language = $${paramIndex}`;
      values.push(params.language);
      paramIndex++;
    }

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

    query += ` ORDER BY duration_min DESC`;

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
    }

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToFocusStreak(row));
  }

  async getBestGlobalStreak(userId: string): Promise<FocusStreak | null> {
    const streaks = await this.getBestStreaks({
      userId,
      type: 'global',
      limit: 1,
    });

    return streaks.length > 0 ? streaks[0] : null;
  }

  async getBestPerFileStreaks(userId: string, limit: number = 10): Promise<FocusStreak[]> {
    return this.getBestStreaks({
      userId,
      type: 'per_file',
      limit,
    });
  }

  private mapRowToFocusStreak(row: any): FocusStreak {
    return {
      id: row.id,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      sessionId: row.session_id,
      type: row.type,
      fileHash: row.file_hash,
      language: row.language,
      startTs: new Date(row.start_ts),
      endTs: new Date(row.end_ts),
      durationMin: parseFloat(row.duration_min),
      createdAt: new Date(row.created_at),
    };
  }
}

export default new FocusStreakService();
