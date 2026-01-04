import { getPool } from '../../../config/db';
import type { CreateTaskRunInput, TaskRun, TaskRunStats } from './taskRuns.types';

export const taskRunsService = {
  async createRun(input: CreateTaskRunInput): Promise<TaskRun> {
    const pool = getPool();
    const query = `
      INSERT INTO task_runs (
        user_id, workspace_id, label, kind, start_ts, end_ts, 
        duration_sec, result, pid, is_watch_like
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      input.userId,
      input.workspaceId || null,
      input.label,
      input.kind,
      input.startTs,
      input.endTs,
      input.durationSec,
      input.result,
      input.pid || null,
      input.isWatchLike || false,
    ];

    const result = await pool.query(query, values);
    return mapRowToTaskRun(result.rows[0]);
  },

  async getStats(
    userId: string,
    excludeWatchLike: boolean = true,
    since?: string
  ): Promise<TaskRunStats> {
    const pool = getPool();
    
    // Build the WHERE clause
    let whereConditions = ['user_id = $1', 'result IN ($2, $3)'];
    const params: any[] = [userId, 'pass', 'fail'];
    let paramIndex = 4;

    if (excludeWatchLike) {
      whereConditions.push('is_watch_like = FALSE');
    }

    if (since) {
      whereConditions.push(`start_ts >= $${paramIndex}`);
      params.push(since);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Test stats
    const testQuery = `
      SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE result = 'pass') as passes,
        AVG(duration_sec) FILTER (WHERE result IN ('pass', 'fail')) as avg_duration
      FROM task_runs
      WHERE ${whereClause} AND kind = 'test'
    `;

    // Build stats
    const buildQuery = `
      SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE result = 'pass') as passes,
        AVG(duration_sec) FILTER (WHERE result IN ('pass', 'fail')) as avg_duration
      FROM task_runs
      WHERE ${whereClause} AND kind = 'build'
    `;

    // Recent labels
    const labelsQuery = `
      SELECT DISTINCT label
      FROM task_runs
      WHERE ${whereClause}
      ORDER BY label
      LIMIT 10
    `;

    const [testResult, buildResult, labelsResult] = await Promise.all([
      pool.query(testQuery, params),
      pool.query(buildQuery, params),
      pool.query(labelsQuery, params),
    ]);

    const testRow = testResult.rows[0];
    const buildRow = buildResult.rows[0];

    const testTotalRuns = parseInt(testRow.total_runs, 10) || 0;
    const testPasses = parseInt(testRow.passes, 10) || 0;
    const testAvgDuration = testRow.avg_duration ? parseFloat(testRow.avg_duration) : null;

    const buildTotalRuns = parseInt(buildRow.total_runs, 10) || 0;
    const buildPasses = parseInt(buildRow.passes, 10) || 0;
    const buildAvgDuration = buildRow.avg_duration ? parseFloat(buildRow.avg_duration) : null;

    return {
      test: {
        totalRuns: testTotalRuns,
        passes: testPasses,
        passRate: testTotalRuns > 0 ? testPasses / testTotalRuns : 0,
        avgDurationSec: testAvgDuration,
      },
      build: {
        totalRuns: buildTotalRuns,
        passes: buildPasses,
        passRate: buildTotalRuns > 0 ? buildPasses / buildTotalRuns : 0,
        avgDurationSec: buildAvgDuration,
      },
      recentLabels: labelsResult.rows.map((row: any) => row.label),
    };
  },
};

function mapRowToTaskRun(row: any): TaskRun {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    label: row.label,
    kind: row.kind,
    startTs: row.start_ts,
    endTs: row.end_ts,
    durationSec: row.duration_sec,
    result: row.result,
    pid: row.pid,
    isWatchLike: row.is_watch_like,
    createdAt: row.created_at,
  };
}
