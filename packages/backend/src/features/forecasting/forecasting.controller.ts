import type { Request, Response } from 'express';
import { getProductiveMinutesForecast } from './forecasting.service.js';
import { query } from '../../config/db.js';

export async function getForecast(req: Request, res: Response) {
  const { userId } = req.params;

  const daysRaw = req.query.days;
  const days = Number(daysRaw ?? 7);

  const saveRaw = req.query.save; // "true" / "false"
  const save = String(saveRaw ?? 'false').toLowerCase() === 'true';

  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!Number.isFinite(days)) return res.status(400).json({ error: 'days must be a number' });

  try {
    const result = await getProductiveMinutesForecast(userId, days);

    if (save) {
      // Save each predicted point
      // model_version from note is messy; keep constant for now
      const modelVersion = 'baseline_v2';

      for (let i = 0; i < result.points.length; i++) {
        const p = result.points[i];
        await query(
          `
          INSERT INTO forecast_predictions_daily
            (user_id, forecast_for_date, horizon_day, predicted_productive_minutes, lower_minutes, upper_minutes, model_version)
          VALUES
            ($1, $2::date, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, forecast_for_date, model_version)
          DO UPDATE SET
            predicted_productive_minutes = EXCLUDED.predicted_productive_minutes,
            lower_minutes = EXCLUDED.lower_minutes,
            upper_minutes = EXCLUDED.upper_minutes,
            horizon_day = EXCLUDED.horizon_day,
            generated_at = NOW()
          `,
          [
            result.userId,
            p.date,
            i + 1,
            p.productiveMinutes,
            p.lower ?? null,
            p.upper ?? null,
            modelVersion,
          ]
        );
      }

      // add a small note so you know it saved
      return res.json({ ...result, note: `${result.note} (Saved to DB as ${modelVersion})` });
    }

    return res.json(result);
  } catch (err) {
    console.error('Forecast error:', err);
    return res.status(500).json({ error: 'Failed to generate forecast' });
  }
}
