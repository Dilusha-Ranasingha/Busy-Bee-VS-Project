import { query } from '../../../config/db.js';
import type { CreateFileSwitchWindowInput, FileSwitchWindowRow } from './fileSwitch.types.js';

function isValidIsoDate(value: string): boolean {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function validateCreatePayload(payload: any): asserts payload is CreateFileSwitchWindowInput {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid body');

  const {
    sessionId,
    windowStart,
    windowEnd,
    activationCount,
    ratePerMin,
    workspaceTag,
  } = payload;

  if (!sessionId || typeof sessionId !== 'string') throw new Error('sessionId is required');
  if (!windowStart || typeof windowStart !== 'string' || !isValidIsoDate(windowStart)) throw new Error('windowStart must be ISO date string');
  if (!windowEnd || typeof windowEnd !== 'string' || !isValidIsoDate(windowEnd)) throw new Error('windowEnd must be ISO date string');

  const ws = new Date(windowStart).getTime();
  const we = new Date(windowEnd).getTime();
  if (we <= ws) throw new Error('windowEnd must be after windowStart');

  if (typeof activationCount !== 'number' || !Number.isFinite(activationCount) || activationCount < 0) {
    throw new Error('activationCount must be a non-negative number');
  }

  if (typeof ratePerMin !== 'number' || !Number.isFinite(ratePerMin) || ratePerMin < 0) {
    throw new Error('ratePerMin must be a non-negative number');
  }

  if (workspaceTag !== undefined && typeof workspaceTag !== 'string') {
    throw new Error('workspaceTag must be a string');
  }
}

export async function createFileSwitchWindow(input: CreateFileSwitchWindowInput) {
  const sql = `
    INSERT INTO file_switch_windows (
      session_id, window_start, window_end,
      activation_count, rate_per_min, workspace_tag
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id, session_id, window_start, window_end,
      activation_count, rate_per_min, workspace_tag, created_at
  `;

  const params = [
    input.sessionId,
    input.windowStart,
    input.windowEnd,
    input.activationCount,
    input.ratePerMin,
    input.workspaceTag ?? null,
  ];

  const result = await query<FileSwitchWindowRow>(sql, params);
  return result.rows[0];
}

export async function getWindowsBySession(sessionId: string) {
  const sql = `
    SELECT
      id, session_id, window_start, window_end,
      activation_count, rate_per_min, workspace_tag, created_at
    FROM file_switch_windows
    WHERE session_id = $1
    ORDER BY window_start ASC
  `;
  const result = await query<FileSwitchWindowRow>(sql, [sessionId]);
  return result.rows;
}

/**
 * Optional helper for dashboard: sessions recorded on a day (local day boundary is up to you).
 * This uses UTC date boundaries for simplicity.
 */
export async function listSessionsByDate(dateYYYYMMDD: string) {
  // Basic format check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYYYYMMDD)) {
    throw new Error('date must be YYYY-MM-DD');
  }

  const start = `${dateYYYYMMDD}T00:00:00.000Z`;
  const end = `${dateYYYYMMDD}T23:59:59.999Z`;

  const sql = `
    SELECT
      session_id,
      MIN(window_start) AS session_start,
      MAX(window_end)   AS session_end,
      COUNT(*)          AS window_count
    FROM file_switch_windows
    WHERE window_start >= $1 AND window_start <= $2
    GROUP BY session_id
    ORDER BY MIN(window_start) DESC
  `;

  const result = await query(sql, [start, end]);
  return result.rows;
}
