import type { Request, Response } from 'express';
import { getProductiveMinutesForecast } from './forecasting.service.js';

export async function getForecast(req: Request, res: Response) {
  const { userId } = req.params;

  const daysRaw = req.query.days;
  const days = Number(daysRaw ?? 7);

  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!Number.isFinite(days)) return res.status(400).json({ error: 'days must be a number' });

  try {
    const result = await getProductiveMinutesForecast(userId, days);
    return res.json(result);
  } catch (err) {
    console.error('Forecast error:', err);
    return res.status(500).json({ error: 'Failed to generate forecast' });
  }
}
