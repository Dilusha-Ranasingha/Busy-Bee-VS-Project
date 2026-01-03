import { query } from '../../config/db.js';
import type { ForecastResponse, ForecastPoint } from './forecasting.types.js';

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Weighted average: recent days matter more
function weightedAverage(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;

  let weightSum = 0;
  let total = 0;

  // values must be ordered oldest -> newest
  for (let i = 0; i < n; i++) {
    const w = i + 1; // older->1 ... newest->n
    weightSum += w;
    total += values[i] * w;
  }

  return total / weightSum;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Baseline forecast from DB:
 * - reads last 7 days total_focus_minutes from daily_focus_summary
 * - predicts next 1..7 days using (weighted avg + simple trend)
 */
export async function getProductiveMinutesForecast(
  userId: string,
  horizonDays: number
): Promise<ForecastResponse> {
  const days = Math.max(1, Math.min(7, horizonDays));

  // 1) fetch last 7 days (oldest -> newest)
  const result = await query<{
    date: string;
    total_focus_minutes: number;
  }>(
    `
    SELECT date, total_focus_minutes
    FROM daily_focus_summary
    WHERE user_id = $1
    ORDER BY date ASC
    LIMIT 7
    `,
    [userId]
  );

  const focusValues = result.rows.map((r) => Number(r.total_focus_minutes || 0));

  // Base level (weighted average) + fallback
  const base = focusValues.length ? weightedAverage(focusValues) : 120;

  // 2) compute trend from last 6 days if possible:
  // trend = avg(last3) - avg(prev3)
  let trend = 0;
  if (focusValues.length >= 6) {
    const last3 = focusValues.slice(-3);
    const prev3 = focusValues.slice(-6, -3);
    trend = avg(last3) - avg(prev3);
  }

  // Clamp trend so predictions don't jump too much
  if (trend > 60) trend = 60;
  if (trend < -60) trend = -60;

  // 3) produce future points with gentle trend
  const points: ForecastPoint[] = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    // gradually apply trend across the horizon (weather-like)
    const trendFactor = i * 0.2; // 0.2, 0.4, ... 1.4
    const predicted = Math.max(0, Math.round(base + trendFactor * trend));

    points.push({
      date: toYMD(d),
      productiveMinutes: predicted,
      lower: Math.max(0, predicted - 15),
      upper: predicted + 15,
    });
  }

  return {
    userId,
    horizonDays: days,
    generatedAt: new Date().toISOString(),
    points,
    note: focusValues.length
      ? `Baseline forecast from daily_focus_summary (weighted avg + trend). Trend=${Math.round(trend)}`
      : 'No history found. Using default baseline.',
  };
}
