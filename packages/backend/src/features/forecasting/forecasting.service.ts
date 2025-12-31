import type { ForecastResponse, ForecastPoint } from './forecasting.types.js';

function toYMD(d: Date) {
  // YYYY-MM-DD in local time (good enough for now)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Dummy forecast (no ML yet).
 * Returns a stable, realistic-looking 7-day curve so frontend can be built now.
 */
export function getProductiveMinutesForecast(userId: string, horizonDays: number): ForecastResponse {
  const days = Math.max(1, Math.min(7, horizonDays)); // cap to 1..7
  const base = 120; // 2 hours baseline dummy

  const points: ForecastPoint[] = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    // small wave to look realistic (Mon..Sun pattern-ish)
    const wave = Math.round(20 * Math.sin(i)); // -20..+20 approx
    const predicted = Math.max(0, base + wave);

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
    note: 'Dummy forecast. Replace with ML service output later.',
  };
}
