import { getPool } from '../../../config/db';
import { ProductivityScore, CreateProductivityScoreInput } from './productivityScore.types';

export const createScore = async (input: CreateProductivityScoreInput): Promise<ProductivityScore> => {
  const pool = getPool();

  const result = await pool.query(
    `INSERT INTO productivity_score (user_id, date, score, recommendations)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       score = EXCLUDED.score,
       recommendations = EXCLUDED.recommendations,
       created_at = NOW()
     RETURNING
       id,
       user_id as "userId",
       date,
       score,
       recommendations,
       created_at as "createdAt"`,
    [input.userId, input.date, input.score, JSON.stringify(input.recommendations)]
  );

  return result.rows[0];
};

export const getScore = async (userId: string, date: string): Promise<ProductivityScore | null> => {
  const pool = getPool();

  const result = await pool.query(
    `SELECT
       id,
       user_id as "userId",
       date,
       score,
       recommendations,
       created_at as "createdAt"
     FROM productivity_score
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );

  return result.rows[0] || null;
};

export const getScoreRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<ProductivityScore[]> => {
  const pool = getPool();

  const result = await pool.query(
    `SELECT
       id,
       user_id as "userId",
       date,
       score,
       recommendations,
       created_at as "createdAt"
     FROM productivity_score
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date DESC`,
    [userId, startDate, endDate]
  );

  return result.rows;
};
