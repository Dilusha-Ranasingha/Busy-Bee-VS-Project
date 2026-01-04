import { getPool } from '../../../config/db';
import type { CreateCommitEditSessionInput, CommitEditSession, CommitEditStats } from './commitEditSessions.types';

export const commitEditSessionsService = {
  async createSession(input: CreateCommitEditSessionInput): Promise<CommitEditSession> {
    const pool = getPool();
    const query = `
      INSERT INTO commit_edit_sessions (
        session_id, user_id, workspace_id, start_ts, end_ts, time_to_commit_min,
        edits_per_commit, chars_added_per_commit, chars_deleted_per_commit,
        files_in_commit, lines_added, lines_deleted, repo_id, commit_sha, aborted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      input.sessionId,
      input.userId,
      input.workspaceId || null,
      input.startTs,
      input.endTs,
      input.timeToCommitMin,
      input.editsPerCommit,
      input.charsAddedPerCommit,
      input.charsDeletedPerCommit,
      input.filesInCommit,
      input.linesAdded || null,
      input.linesDeleted || null,
      input.repoId || null,
      input.commitSha || null,
      input.aborted || false,
    ];

    const result = await pool.query(query, values);
    return mapRowToSession(result.rows[0]);
  },

  async getStats(userId: string): Promise<CommitEditStats> {
    const pool = getPool();

    // Highest batch
    const highestQuery = `
      SELECT edits_per_commit, time_to_commit_min, start_ts, end_ts, commit_sha
      FROM commit_edit_sessions
      WHERE user_id = $1 AND aborted = FALSE
      ORDER BY edits_per_commit DESC, time_to_commit_min DESC
      LIMIT 1
    `;

    // Lowest batch (>0)
    const lowestQuery = `
      SELECT edits_per_commit, time_to_commit_min, start_ts, end_ts, commit_sha
      FROM commit_edit_sessions
      WHERE user_id = $1 AND aborted = FALSE AND edits_per_commit > 0
      ORDER BY edits_per_commit ASC, time_to_commit_min ASC
      LIMIT 1
    `;

    // Today count
    const todayQuery = `
      SELECT COUNT(*) as count
      FROM commit_edit_sessions
      WHERE user_id = $1 AND aborted = FALSE
        AND start_ts::date = CURRENT_DATE
    `;

    const [highestResult, lowestResult, todayResult] = await Promise.all([
      pool.query(highestQuery, [userId]),
      pool.query(lowestQuery, [userId]),
      pool.query(todayQuery, [userId]),
    ]);

    const highest = highestResult.rows[0]
      ? {
          editsPerCommit: highestResult.rows[0].edits_per_commit,
          timeToCommitMin: parseFloat(highestResult.rows[0].time_to_commit_min),
          startTs: highestResult.rows[0].start_ts,
          endTs: highestResult.rows[0].end_ts,
          commitSha: highestResult.rows[0].commit_sha,
        }
      : null;

    const lowest = lowestResult.rows[0]
      ? {
          editsPerCommit: lowestResult.rows[0].edits_per_commit,
          timeToCommitMin: parseFloat(lowestResult.rows[0].time_to_commit_min),
          startTs: lowestResult.rows[0].start_ts,
          endTs: lowestResult.rows[0].end_ts,
          commitSha: lowestResult.rows[0].commit_sha,
        }
      : null;

    const todayCount = parseInt(todayResult.rows[0].count, 10);

    return {
      highest,
      lowest,
      todayCount,
    };
  },
};

function mapRowToSession(row: any): CommitEditSession {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    startTs: row.start_ts,
    endTs: row.end_ts,
    timeToCommitMin: parseFloat(row.time_to_commit_min),
    editsPerCommit: row.edits_per_commit,
    charsAddedPerCommit: row.chars_added_per_commit,
    charsDeletedPerCommit: row.chars_deleted_per_commit,
    filesInCommit: row.files_in_commit,
    linesAdded: row.lines_added,
    linesDeleted: row.lines_deleted,
    repoId: row.repo_id,
    commitSha: row.commit_sha,
    aborted: row.aborted,
    createdAt: row.created_at,
  };
}
